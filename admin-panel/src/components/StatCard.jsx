const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function StatCard({ title, value, color = 'blue' }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-gray-600 text-sm uppercase tracking-wide mb-2">
        {title}
      </h3>
      <p className={`text-4xl font-bold ${colorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

