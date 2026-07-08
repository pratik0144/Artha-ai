import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSession } from '../context/SessionContext';
import { CheckCircle2, FileText, IndianRupee, Search, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { getAllSchemes, recommendSchemes } from '../api';

export const Schemes = () => {
  const { schemes: activeSchemes, profile } = useSession();
  const [recommended, setRecommended] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recommended'); // recommended | all

  const asText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      return value.name || value.title || value.benefits || value.description || JSON.stringify(value);
    }
    return String(value);
  };

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const [recData, allData] = await Promise.all([
          recommendSchemes({
            account_id: profile?.account_id || 'JD-1001',
            occupation: profile?.occupation || 'farmer',
            income_bracket: profile?.income_bracket || 'medium',
            state: profile?.location || 'Punjab'
          }),
          getAllSchemes()
        ]);
        if (recData && recData.status === 'success') {
          setRecommended(recData.recommendations || []);
        }
        if (allData && allData.status === 'success') {
          setAllSchemes(allData.schemes || []);
        }
      } catch (e) {
        console.error('[SCHEMES] API fetch failed:', e);
      }
      setLoading(false);
    };
    fetchSchemes();
  }, [profile]);

  const displaySchemes = tab === 'recommended' ? recommended : allSchemes;
  const filtered = searchQuery
    ? displaySchemes.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tags?.some(t => asText(t).toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : displaySchemes;

  const activeList = activeSchemes || ['PM-KISAN'];

  const schemeDetailMap = {
    "PM-KISAN": { title: "PM-KISAN Samman Nidhi", desc: "₹6000/year income support for landholding farmers.", status: "Active", amount: "₹2,000 Next Installment" },
    "MGNREGA": { title: "MGNREGA", desc: "100 days of guaranteed wage employment.", status: "Active", amount: "₹267/day" },
    "PMJDY": { title: "Jan Dhan Yojana", desc: "Zero balance bank account with insurance.", status: "Active", amount: "₹10,000 overdraft" },
  };

  const severityColor = (score) => {
    if (score >= 100) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-blue-400';
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="h2 text-primary">Government Schemes</h2>
        <p className="body-sm text-secondary mt-1">
          {loading ? 'Loading schemes...' : `${allSchemes.length} schemes available — personalized for you`}
        </p>
      </div>

      {/* Active Schemes */}
      {activeList.length > 0 && (
        <>
          <h3 className="label text-secondary uppercase mb-4">Your Active Schemes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {activeList.map((name) => {
              const d = schemeDetailMap[name] || { title: name, desc: "Government Scheme", status: "Active", amount: "-" };
              return (
                <Card key={name} className="border-l-4 border-l-primary flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">{asText(d.title)}</h4>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary bg-primary-container px-2 py-1 rounded-full">
                      <CheckCircle2 size={12} />
                      <span>{d.status}</span>
                    </div>
                  </div>
                  <p className="body-sm text-secondary mb-4 flex-1">{d.desc}</p>
                  <div className="bg-surface-container p-3 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <IndianRupee size={16} className="text-primary" />
                      <span className="font-semibold">{d.amount}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Tab Switcher + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('recommended')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === 'recommended' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:bg-surface-container-high'}`}
          >
            Recommended ({recommended.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:bg-surface-container-high'}`}
          >
            All Schemes ({allSchemes.length})
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container text-on-surface text-sm border-none outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Scheme Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-secondary">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading schemes...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((scheme) => {
            const isExpanded = expandedId === scheme.id;
            return (
              <Card
                key={scheme.id}
                className="cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
              >
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-1">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-base">{asText(scheme.name)}</h4>
                        <p className="text-xs text-secondary mt-0.5">{asText(scheme.ministry)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {scheme.score && (
                          <span className={`text-xs font-bold ${severityColor(scheme.score)}`}>
                            Match: {scheme.score}%
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
                      </div>
                    </div>
                    <p className="body-sm text-secondary mt-1">{asText(scheme.benefits || scheme.description)}</p>
                    {scheme.why_for_you && (
                      <p className="text-xs text-primary mt-1 italic">💡 {asText(scheme.why_for_you)}</p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-outline-variant space-y-3 animate-fadeIn">
                    <p className="body-sm text-secondary">{asText(scheme.description)}</p>

                    {scheme.documents_required?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-secondary uppercase mb-1">Documents Required</p>
                        <div className="flex flex-wrap gap-1">
                          {scheme.documents_required.map((doc, i) => (
                            <span key={i} className="text-xs bg-surface-container px-2 py-1 rounded-full">{asText(doc)}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scheme.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scheme.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-primary-container text-primary px-2 py-0.5 rounded-full">#{asText(tag)}</span>
                        ))}
                      </div>
                    )}

                    {scheme.how_to_apply && (
                      <p className="text-xs text-secondary">📋 <strong>How to apply:</strong> {asText(scheme.how_to_apply)}</p>
                    )}

                    {scheme.source_url && (
                      <a
                        href={scheme.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink size={12} /> Visit official website
                      </a>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-secondary">
              <p>No schemes found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
