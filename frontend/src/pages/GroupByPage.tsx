import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchGroupBy } from '../services/transfersService';
import type { GroupByResult } from '../services/transfersService';
import { fetchLabels } from '../services/labelsService';
import type { Label } from '../services/labelsService';
import { ActionBar } from '../components/ActionBar';
import type { TransferFilters } from '../components/ActionBar';
import { ResponsiveBar } from '@nivo/bar';

/** Matches Nivo's internal BarDatum constraint: values must be string | number */
type NivoBarDatum = { [key: string]: string | number };

const EMPTY_FILTERS: TransferFilters = { search: '', dateFrom: '', dateTo: '', labelIds: [], accountIds: [] };

type GroupByMode = 'period' | 'label' | 'label_and_period';
type PeriodMode = 'month' | 'quarter' | 'year';

// Categorical colours for multi-label chart
const LABEL_COLOURS = [
    '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

/** Derive date range boundaries from a period string + period granularity. */
function periodToDateRange(periodStr: string, periodMode: PeriodMode): { dateFrom: string; dateTo: string } | null {
    if (periodMode === 'month' && /^\d{4}-\d{2}$/.test(periodStr)) {
        const [y, m] = periodStr.split('-');
        const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
        return { dateFrom: `${y}-${m}-01`, dateTo: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
    }
    if (periodMode === 'quarter' && /^\d{4}-Q[1-4]$/.test(periodStr)) {
        const [year, q] = periodStr.split('-Q');
        const startMonth = (parseInt(q, 10) - 1) * 3 + 1;
        const endMonth   = parseInt(q, 10) * 3;
        const lastDay    = new Date(parseInt(year, 10), endMonth, 0).getDate();
        return {
            dateFrom: `${year}-${String(startMonth).padStart(2, '0')}-01`,
            dateTo:   `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        };
    }
    if (periodMode === 'year' && /^\d{4}$/.test(periodStr)) {
        return { dateFrom: `${periodStr}-01-01`, dateTo: `${periodStr}-12-31` };
    }
    return null;
}

const GroupByPage: React.FC = () => {
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [filters, setFilters]   = useState<TransferFilters>(EMPTY_FILTERS);
    const [groupBy, setGroupBy]   = useState<GroupByMode>('period');
    const [period, setPeriod]     = useState<PeriodMode>('month');
    const [labels, setLabels]     = useState<Label[]>([]);
    const [data, setData]         = useState<GroupByResult[]>([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;
        fetchLabels(accessToken).then(setLabels).catch(() => {});
    }, [accessToken]);

    const loadData = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const results = await fetchGroupBy(
                {
                    groupBy,
                    period,
                    dateFrom: filters.dateFrom || undefined,
                    dateTo:   filters.dateTo   || undefined,
                    labelIds: filters.labelIds.length > 0 ? filters.labelIds : undefined,
                },
                accessToken,
            );
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load group-by data');
        } finally {
            setLoading(false);
        }
    }, [accessToken, groupBy, period, filters]);

    useEffect(() => { void loadData(); }, [loadData]);

    const labelOptions = labels.map((l) => ({ id: l.id, name: l.name }));

    // ── Chart data preparation ─────────────────────────────────────────────

    // Single-dimension chart data (period or label)
    const singleBarData = data.map((d) => ({
        id:     d.period,
        period: d.labelName ?? d.period,
        amount: parseFloat(d.totalAmount),
        count:  d.transferCount,
    }));

    // Multi-dimension chart data for label_and_period
    const uniqueLabelKeys: string[] = Array.from(
        new Set(data.map((d) => d.labelName ?? d.labelId ?? 'Unknown')),
    );
    const labelColourMap: Record<string, string> = {};
    uniqueLabelKeys.forEach((key, i) => {
        labelColourMap[key] = LABEL_COLOURS[i % LABEL_COLOURS.length];
    });

    const multiBarData: NivoBarDatum[] = (() => {
        const byPeriod: Record<string, NivoBarDatum> = {};
        data.forEach((d) => {
            const p     = d.period;
            const label = d.labelName ?? d.labelId ?? 'Unknown';
            if (!byPeriod[p]) byPeriod[p] = { period: p };
            byPeriod[p][label] = parseFloat(d.totalAmount);
        });
        return Object.values(byPeriod).sort((a, b) =>
            String(a['period']).localeCompare(String(b['period'])),
        );
    })();

    // ── Click handler ──────────────────────────────────────────────────────

    const handleBarClick = (datum: { id: string | number; indexValue: string | number; data: NivoBarDatum }) => {
        const indexVal = String(datum.indexValue); // x-axis value (period string, or label name for label mode)
        const keyVal   = String(datum.id);         // the key name (label name for multi-key charts)

        if (groupBy === 'label_and_period') {
            const range = periodToDateRange(indexVal, period);
            const matchingLabel = labels.find((l) => l.name === keyVal);
            if (range && matchingLabel) {
                navigate(`/transfers?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}&labelIds[]=${matchingLabel.id}`);
            } else if (range) {
                navigate(`/transfers?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
            }
            return;
        }

        if (groupBy === 'period') {
            const range = periodToDateRange(indexVal, period);
            if (range) navigate(`/transfers?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
            return;
        }

        // label mode: datum.data.id holds the label UUID (set as singleBarData[i].id)
        if (groupBy === 'label') {
            const labelUuid = String(datum.data['id'] ?? indexVal);
            if (labelUuid) navigate(`/transfers?labelIds[]=${labelUuid}`);
        }
    };

    // ── Value scale: always include 0 so negative-only data renders correctly ─
    // Nivo computes max = Math.max(all values) without including 0, so for
    // all-negative data the domain becomes [negMin, negMax] — when there is
    // only one data point min===max, the scale degenerates and all bar heights
    // become 0 (invisible). Explicitly including 0 fixes both issues.
    const allAmounts    = data.map((d) => parseFloat(d.totalAmount));
    const rawValueMin   = allAmounts.length > 0 ? Math.min(0, ...allAmounts) : -1;
    const rawValueMax   = allAmounts.length > 0 ? Math.max(0, ...allAmounts) : 1;
    // Guard against degenerate scale (min === max)
    const nivoValueMin  = rawValueMin < rawValueMax ? rawValueMin : rawValueMin - 1;
    const nivoValueMax  = rawValueMin < rawValueMax ? rawValueMax : rawValueMax + 1;
    const nivoValueScale = { type: 'linear' as const, min: nivoValueMin, max: nivoValueMax };

    // ── Mode label for heading ─────────────────────────────────────────────
    const modeLabel =
        groupBy === 'label'            ? 'Label' :
        groupBy === 'label_and_period' ? `Label & ${period.charAt(0).toUpperCase() + period.slice(1)}` :
                                         period.charAt(0).toUpperCase() + period.slice(1);

    return (
        <div className="space-y-4">
            <ActionBar
                filters={filters}
                onFiltersChange={setFilters}
                availableLabels={labelOptions}
            >
                {/* Group by / period controls */}
                <div className="flex items-center gap-2 ml-2">
                    <label className="text-sm text-gray-600">Group by:</label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
                        className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        aria-label="Group by"
                    >
                        <option value="period">Period</option>
                        <option value="label">Label</option>
                        <option value="label_and_period">Label &amp; Period</option>
                    </select>
                    {(groupBy === 'period' || groupBy === 'label_and_period') && (
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as PeriodMode)}
                            className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label="Period"
                        >
                            <option value="month">Month</option>
                            <option value="quarter">Quarter</option>
                            <option value="year">Year</option>
                        </select>
                    )}
                </div>
            </ActionBar>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Transfers by {modeLabel}
                </h2>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
                        <span className="text-gray-600">Loading…</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800 text-sm" role="alert">
                        {error}
                        <button onClick={() => void loadData()} className="ml-2 underline">Retry</button>
                    </div>
                )}

                {!loading && !error && data.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No data for the selected filters.</p>
                )}

                {!loading && !error && data.length > 0 && (
                    <>
                        {/* ── Single-dimension chart (period or label) ── */}
                        {groupBy !== 'label_and_period' && (
                            <div style={{ height: 400 }}>
                                <ResponsiveBar
                                    key={`single-${data.length}-${nivoValueMin}-${nivoValueMax}`}
                                    data={singleBarData}
                                    keys={['amount']}
                                    indexBy="period"
                                    valueScale={nivoValueScale}
                                    margin={{ top: 20, right: 30, bottom: 80, left: 70 }}
                                    padding={0.3}
                                    valueFormat=".2f"
                                    colors={({ value }) => ((value ?? 0) >= 0) ? '#22c55e' : '#ef4444'}
                                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                    axisBottom={{
                                        tickSize: 5, tickPadding: 5, tickRotation: -45,
                                        legend: groupBy === 'label' ? 'Label' : 'Period',
                                        legendPosition: 'middle', legendOffset: 60,
                                    }}
                                    axisLeft={{
                                        tickSize: 5, tickPadding: 5,
                                        legend: 'Amount (€)', legendPosition: 'middle', legendOffset: -60,
                                    }}
                                    labelSkipWidth={12}
                                    labelSkipHeight={12}
                                    tooltip={({ value, indexValue }) => (
                                        <div className="bg-white border border-gray-200 rounded shadow-md px-3 py-2 text-sm">
                                            <strong>{indexValue}</strong><br />
                                            Amount:{' '}
                                            <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {value.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    onClick={handleBarClick}
                                    role="img"
                                    ariaLabel="Transfers bar chart"
                                />
                            </div>
                        )}

                        {/* ── Multi-dimension chart (label & period) ── */}
                        {groupBy === 'label_and_period' && (
                            <div style={{ height: 420 }}>
                                <ResponsiveBar
                                    key={`multi-${data.length}-${nivoValueMin}-${nivoValueMax}`}
                                    data={multiBarData}
                                    keys={uniqueLabelKeys}
                                    indexBy="period"
                                    valueScale={nivoValueScale}
                                    groupMode="grouped"
                                    margin={{ top: 20, right: 160, bottom: 80, left: 70 }}
                                    padding={0.2}
                                    innerPadding={2}
                                    valueFormat=".2f"
                                    colors={({ id }) => labelColourMap[String(id)] ?? '#94a3b8'}
                                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                                    axisBottom={{
                                        tickSize: 5, tickPadding: 5, tickRotation: -45,
                                        legend: 'Period', legendPosition: 'middle', legendOffset: 60,
                                    }}
                                    axisLeft={{
                                        tickSize: 5, tickPadding: 5,
                                        legend: 'Amount (€)', legendPosition: 'middle', legendOffset: -60,
                                    }}
                                    labelSkipWidth={14}
                                    labelSkipHeight={14}
                                    legends={[{
                                        dataFrom: 'keys',
                                        anchor: 'bottom-right',
                                        direction: 'column',
                                        translateX: 150,
                                        itemWidth: 140,
                                        itemHeight: 20,
                                        itemsSpacing: 2,
                                        symbolSize: 12,
                                    }]}
                                    tooltip={({ id, value, indexValue }) => (
                                        <div className="bg-white border border-gray-200 rounded shadow-md px-3 py-2 text-sm">
                                            <strong>{indexValue}</strong> — {id}<br />
                                            Amount:{' '}
                                            <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {value.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    onClick={handleBarClick}
                                    role="img"
                                    ariaLabel="Transfers grouped bar chart by label and period"
                                />
                            </div>
                        )}

                        {/* ── Data table ── */}
                        <div className="mt-6 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {groupBy === 'label_and_period' && (
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                        )}
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            {groupBy === 'period' ? 'Period' : 'Label'}
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Transfers</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => handleBarClick({
                                                id: row.labelName ?? row.labelId ?? 'Unknown',
                                                indexValue: row.period,
                                                data: { id: row.labelId ?? row.period, period: row.period },
                                            })}
                                        >
                                            {groupBy === 'label_and_period' && (
                                                <td className="px-4 py-2 text-gray-500">{row.period}</td>
                                            )}
                                            <td className="px-4 py-2">
                                                {groupBy === 'period' ? row.period : (row.labelName ?? row.period)}
                                            </td>
                                            <td className={`px-4 py-2 text-right font-mono ${parseFloat(row.totalAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {parseFloat(row.totalAmount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-right">{row.transferCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GroupByPage;

