import type { TreeRow } from './types';

const getTreeRowEditId = (row: TreeRow): string => `${row.original.id}:${String(row.original.value)}`;

export { getTreeRowEditId };
