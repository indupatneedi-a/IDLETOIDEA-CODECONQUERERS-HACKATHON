import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { aiService, MatchResult } from '../services/ai';
import { Resource } from '../types';
import { AccessModeBadge } from './StatusChip';

interface FindMyMatchProps {
  resources: Resource[];
  onSelectResource: (resourceId: string) => void;
}

export const FindMyMatch: React.FC<FindMyMatchProps> = ({ resources, onSelectResource }) => {
  const [projectText, setProjectText] = useState('');
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectText.trim()) return;

    setIsLoading(true);
    try {
      const res = await aiService.findMyMatch(resources, projectText, budget);
      setMatches(res.results);
      setIsFallback(res.isFallback);
    } catch (err) {
      console.error(err);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (resources.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-5 sm:p-6 text-left mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7A1F3D] text-[#F5F1F2] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#F4A6C0]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F5F1F2]">Find My Match</h3>
            <p className="text-xs text-[#B8AEB2]">
              Describe what you are building to match listed equipment and spaces.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D0D0F] border border-[#2C2A2F] text-[11px] font-mono-code text-[#F4A6C0] self-start sm:self-auto">
          AI-generated, advisory only
        </span>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <textarea
          value={projectText}
          onChange={(e) => setProjectText(e.target.value)}
          rows={2}
          placeholder="Describe your project materials, dimensions, or technical requirements..."
          className="w-full rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] p-3 text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/60 outline-none resize-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="match-budget" className="text-xs text-[#B8AEB2]">
              Max price filter (optional):
            </label>
            <input
              id="match-budget"
              type="number"
              min="0"
              placeholder="Any"
              value={budget === undefined ? '' : budget}
              onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
              className="w-24 px-2.5 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] placeholder-[#B8AEB2]/60 outline-none focus:border-[#F4A6C0]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !projectText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4A6C0]" />
            <span>{isLoading ? 'Matching...' : 'Find Matches'}</span>
          </button>
        </div>
      </form>

      {matches && isFallback && (
        <div className="mt-4 p-2.5 rounded-lg bg-[#0D0D0F] border border-[#E0A33A]/50 text-[#E0A33A] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>AI assistant unavailable; showing keyword-based matches instead.</span>
        </div>
      )}

      {matches && (
        <div className="mt-5 pt-4 border-t border-[#2C2A2F]">
          <h4 className="text-xs font-mono-code uppercase tracking-wider text-[#F4A6C0] mb-3">
            Suggested Matches ({matches.length})
          </h4>

          {matches.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#B8AEB2]">
              No matching resources found in active listings. Try broader keywords.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {matches.map(({ resource, reason, isAiSuggested }) => (
                <button
                  type="button"
                  key={resource.id}
                  onClick={() => onSelectResource(resource.id)}
                  className="p-3.5 rounded-xl bg-[#0D0D0F] hover:bg-[#1E1E24] border border-[#2C2A2F] hover:border-[#F4A6C0] transition-colors text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono-code text-[#B8AEB2]">
                        {isAiSuggested ? 'AI-generated match' : 'Keyword match'}
                      </span>
                      <AccessModeBadge
                        priceMode={resource.priceMode}
                        transferMode={resource.transferMode}
                        price={resource.price}
                        currency={resource.currency}
                        priceUnit={resource.priceUnit}
                      />
                    </div>
                    <h5 className="text-sm font-bold text-[#F5F1F2] group-hover:text-[#F4A6C0] transition-colors mb-1">
                      {resource.title}
                    </h5>
                    <p className="text-xs text-[#B8AEB2] line-clamp-2 mb-3">{reason}</p>
                  </div>

                  <div className="pt-2 border-t border-[#2C2A2F] flex items-center justify-between text-xs text-[#F4A6C0]">
                    <span>View details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
