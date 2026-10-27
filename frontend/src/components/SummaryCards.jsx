import React from 'react';
import { Mail, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

export default function SummaryCards({
  summary,
  activeFilter,
  onFilterChange
}) {
  if (!summary) return null;

  const {
    total_input,
    total_unique,
    total_duplicates,
    likely_delivered,
    likely_to_bounce,
    unknown,
    duration_ms
  } = summary;

  const totalResults = likely_delivered + likely_to_bounce + unknown;

  const getPercentage = (count) => {
    if (!totalResults || totalResults === 0) return '0%';
    return `${Math.round((count / totalResults) * 100)}%`;
  };

  const cards = [
    {
      id: 'ALL',
      title: 'Total Verified',
      count: totalResults,
      subtitle: `${total_unique} unique • ${total_duplicates} duplicate${total_duplicates !== 1 ? 's' : ''}`,
      icon: Mail,
      color: 'slate',
      bgHover: 'hover:border-slate-400',
      activeBorder: 'border-slate-800 ring-2 ring-slate-200',
      iconBg: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'likely_delivered',
      title: 'Likely Delivered',
      count: likely_delivered,
      subtitle: `${getPercentage(likely_delivered)} of total list`,
      icon: CheckCircle2,
      color: 'emerald',
      bgHover: 'hover:border-emerald-400',
      activeBorder: 'border-emerald-600 ring-2 ring-emerald-100',
      iconBg: 'bg-emerald-50 text-emerald-600',
      countColor: 'text-emerald-700'
    },
    {
      id: 'likely_to_bounce',
      title: 'Likely to Bounce',
      count: likely_to_bounce,
      subtitle: `${getPercentage(likely_to_bounce)} of total list`,
      icon: XCircle,
      color: 'rose',
      bgHover: 'hover:border-rose-400',
      activeBorder: 'border-rose-600 ring-2 ring-rose-100',
      iconBg: 'bg-rose-50 text-rose-600',
      countColor: 'text-rose-700'
    },
    {
      id: 'unknown',
      title: 'Unknown',
      count: unknown,
      subtitle: `${getPercentage(unknown)} of total list`,
      icon: AlertTriangle,
      color: 'amber',
      bgHover: 'hover:border-amber-400',
      activeBorder: 'border-amber-500 ring-2 ring-amber-100',
      iconBg: 'bg-amber-50 text-amber-600',
      countColor: 'text-amber-700'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Verification Summary
        </h2>
        {duration_ms !== undefined && (
          <span className="inline-flex items-center space-x-1 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{duration_ms} ms</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeFilter === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onFilterChange(card.id)}
              className={`p-4 rounded-xl bg-white border text-left transition-all cursor-pointer shadow-xs ${
                isActive ? card.activeBorder : 'border-slate-200 ' + card.bgHover
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className={`text-2xl font-extrabold ${card.countColor || 'text-slate-900'}`}>
                  {card.count}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium truncate">
                {card.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
