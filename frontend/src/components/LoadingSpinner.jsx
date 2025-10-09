function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div className={classNames('animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600', sizes[size], className)}>
      <span className="sr-only">Loading...</span>
    </div>
  );
}