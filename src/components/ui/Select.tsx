import { SelectHTMLAttributes, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2 rounded-lg 
          border border-slate-300 dark:border-slate-700 
          bg-white dark:bg-slate-900 
          text-slate-900 dark:text-slate-100 
          focus-visible:outline-none 
          focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 
          focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500 dark:focus-visible:ring-red-400' : ''}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
