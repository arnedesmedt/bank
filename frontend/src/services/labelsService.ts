// API service for fetching labels
export async function fetchLabels(): Promise<Label[]> {
  const response = await fetch('/api/labels');
  if (!response.ok) {
    throw new Error('Failed to fetch labels');
  }
  return response.json();
}

export interface Label {
  id: string;
  name: string;
  description: string;
}

