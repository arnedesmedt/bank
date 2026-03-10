const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// API service for fetching labels
export async function fetchLabels(accessToken: string): Promise<Label[]> {
  const response = await fetch(`${API_URL}/api/labels`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch labels');
  }
  return response.json() as Promise<Label[]>;
}

export interface Label {
  id: string;
  name: string;
  parentLabelId: string | null;
  parentLabelName: string | null;
  linkedBankAccountIds: string[];
  linkedRegexes: string[];
  maxValue: string | null;
  maxPercentage: string | null;
}
