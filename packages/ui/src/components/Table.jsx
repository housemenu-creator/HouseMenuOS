import { ArrowUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Generic data table with sortable columns, empty state, and result count.
 * Renders nothing if rows exist — caller provides renderRow.
 *
 * Usage:
 *   <Table
 *     columns={[{ key: 'name', label: 'Name', sortable: true }]}
 *     rows={data}
 *     sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort}
 *     search={search} total={allData.length}
 *     renderRow={(row) => <td>...</td>}
 *     extraCols={1}
 *   />
 */
export default function Table({
  columns,
  rows,
  sortKey,
  sortDir,
  onToggleSort,
  search,
  total,
  renderRow,
  extraCols = 0,
  className,
}) {
  return (
    <div className={cn('bg-[var(--cm-surface)] border border-[var(--cm-border)] rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--cm-border)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => onToggleSort(col.key) : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-[var(--cm-text-secondary)] uppercase tracking-wider',
                    col.sortable && 'cursor-pointer hover:text-[var(--cm-text)] select-none'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown className={cn('w-3 h-3', sortKey === col.key && 'text-[var(--cm-accent)]')} />
                    )}
                  </span>
                </th>
              ))}
              {extraCols > 0 && (
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--cm-text-secondary)] uppercase tracking-wider">
                  Acción
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + extraCols}
                  className="px-4 py-12 text-center text-sm text-[var(--cm-text-tertiary)]"
                >
                  {search ? 'Sin resultados' : 'Sin datos'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="border-b border-[var(--cm-border)] last:border-0 hover:bg-[var(--cm-surface-hover)] transition-colors"
                >
                  {renderRow(row)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <p className="px-4 py-2 text-xs text-[var(--cm-text-tertiary)] text-right">
          {rows.length} resultado{rows.length !== 1 ? 's' : ''}
          {search && ` (filtrado de ${total})`}
        </p>
      )}
    </div>
  )
}
