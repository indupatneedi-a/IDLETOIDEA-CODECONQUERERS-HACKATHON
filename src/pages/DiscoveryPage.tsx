import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  Layers,
  Cpu,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  ClipboardCheck,
  Printer,
  Scissors,
  Building2,
} from 'lucide-react';
import { Resource, Slot, User } from '../types';
import { api } from '../services/api';
import { RiskBadge, AccessModeBadge } from '../components/StatusChip';
import { FindMyMatch } from '../components/FindMyMatch';

interface DiscoveryPageProps {
  currentUser: User | null;
  resources: Resource[];
  isLoading: boolean;
  onSelectResource: (resourceId: string) => void;
  onStartListEquipment: () => void;
}

const FEATURED_CATEGORIES = [
  { label: '3D Printing', icon: Printer },
  { label: 'Laser & CNC', icon: Scissors },
  { label: 'Electronics', icon: Cpu },
  { label: 'Workshop Tools', icon: Wrench },
  { label: 'Workspaces', icon: Building2 },
  { label: 'Testing & Lab', icon: Layers },
];

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({
  currentUser,
  resources,
  isLoading,
  onSelectResource,
  onStartListEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'equipment' | 'workspace'>('all');
  const [selectedPrice, setSelectedPrice] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedTransfer, setSelectedTransfer] = useState<'all' | 'temporary' | 'permanent'>('all');
  const [selectedRisk, setSelectedRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [slotsByResource, setSlotsByResource] = useState<Record<string, Slot[]>>({});

  useEffect(() => {
    let active = true;
    const tempResources = resources.filter((r) => r.transferMode === 'temporary');
    if (tempResources.length === 0) {
      setSlotsByResource({});
      return;
    }

    Promise.all(
      tempResources.map(async (r) => {
        try {
          const slots = await api.getSlotsForResource(r.id);
          return [r.id, slots] as const;
        } catch {
          return [r.id, [] as Slot[]] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      const map: Record<string, Slot[]> = {};
      for (const [id, slots] of entries) {
        map[id] = slots;
      }
      setSlotsByResource(map);
    });

    return () => {
      active = false;
    };
  }, [resources]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    return api.filterResources(resources, {
      query: searchQuery,
      category: selectedCategory,
      location: locationQuery,
      resourceType: selectedType,
      priceMode: selectedPrice,
      transferMode: selectedTransfer,
      riskLevel: selectedRisk,
      onlyAvailable,
      slotsByResource,
    });
  }, [
    resources,
    searchQuery,
    selectedCategory,
    locationQuery,
    selectedType,
    selectedPrice,
    selectedTransfer,
    selectedRisk,
    onlyAvailable,
    slotsByResource,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'all' ||
    Boolean(locationQuery) ||
    selectedType !== 'all' ||
    selectedPrice !== 'all' ||
    selectedTransfer !== 'all' ||
    selectedRisk !== 'all' ||
    onlyAvailable;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setLocationQuery('');
    setSelectedType('all');
    setSelectedPrice('all');
    setSelectedTransfer('all');
    setSelectedRisk('all');
    setOnlyAvailable(false);
  };

  const getAvailabilitySummary = (resource: Resource): string => {
    if (resource.transferMode === 'permanent') {
      return 'Handover on request';
    }
    const slots = slotsByResource[resource.id];
    if (!slots) return 'Check availability';
    const openCount = slots.filter((s) => s.state === 'available' && new Date(s.end) > new Date()).length;
    if (openCount > 0) {
      return `${openCount} open slot${openCount === 1 ? '' : 's'}`;
    }
    if (slots.length > 0) {
      return 'Waitlist available';
    }
    return 'No slots published yet';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-10">
      {/* Clean Hero Section */}
      <section className="rounded-2xl p-6 sm:p-10 border border-[#2C2A2F] bg-[#17171B] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-45"
          style={{
            background:
              'radial-gradient(circle at 85% 20%, rgba(122, 31, 61, 0.42), transparent 55%)',
          }}
        />
        <div className="relative z-10 max-w-3xl space-y-4">
          <h1 className="font-title text-3xl sm:text-5xl font-bold text-[#F5F1F2] tracking-tight leading-tight">
            Shared workshop tools and creative spaces, ready when you are.
          </h1>
          <p className="text-base sm:text-lg text-[#B8AEB2] leading-relaxed">
            IDLETOIDEA helps organizations share equipment and workspaces while makers check safety requirements, reserve time slots, and record clean handovers.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                document.getElementById('catalog-search')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>Browse equipment</span>
              <ArrowRight className="w-4 h-4 text-[#F4A6C0]" />
            </button>
            <button
              type="button"
              onClick={onStartListEquipment}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D0D0F] hover:bg-[#1E1E24] border border-[#2C2A2F] hover:border-[#F4A6C0] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#F4A6C0]" />
              <span>List your equipment</span>
            </button>
          </div>
        </div>
      </section>

      {/* Prominent Search & Filter Bar */}
      <section id="catalog-search" className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <label htmlFor="search-keyword" className="sr-only">
              Search by keyword
            </label>
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#B8AEB2]" />
            <input
              id="search-keyword"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment, tools, or workspaces..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/60 outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="search-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="search-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] outline-none"
            >
              <option value="all">All categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 relative">
            <label htmlFor="search-location" className="sr-only">
              Filter by location
            </label>
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#B8AEB2]" />
            <input
              id="search-location"
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Location..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] focus:border-[#F4A6C0] text-sm text-[#F5F1F2] placeholder-[#B8AEB2]/60 outline-none"
            />
          </div>

          <div className="md:col-span-2 flex items-center">
            <label className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] text-xs font-medium text-[#F5F1F2] cursor-pointer hover:border-[#F4A6C0]">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-[#F4A6C0] rounded cursor-pointer"
              />
              <span>Available now</span>
            </label>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#2C2A2F] text-xs">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F]">
            {(['all', 'equipment', 'workspace'] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                  selectedType === type
                    ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                    : 'text-[#B8AEB2] hover:text-[#F5F1F2]'
                }`}
              >
                {type === 'all' ? 'All types' : type}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by pricing"
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value as 'all' | 'free' | 'paid')}
            className="px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none"
          >
            <option value="all">Pricing: Any</option>
            <option value="free">Free access</option>
            <option value="paid">Paid rental / sale</option>
          </select>

          <select
            aria-label="Filter by transfer mode"
            value={selectedTransfer}
            onChange={(e) => setSelectedTransfer(e.target.value as 'all' | 'temporary' | 'permanent')}
            className="px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none"
          >
            <option value="all">Access: Any</option>
            <option value="temporary">Time-slot booking</option>
            <option value="permanent">Permanent transfer</option>
          </select>

          <select
            aria-label="Filter by risk level"
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value as 'all' | 'low' | 'medium' | 'high')}
            className="px-3 py-1.5 rounded-lg bg-[#0D0D0F] border border-[#2C2A2F] text-xs text-[#F5F1F2] outline-none"
          >
            <option value="all">Risk level: Any</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#F4A6C0] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Featured Categories */}
      <section className="space-y-3">
        <h2 className="text-sm font-mono-code uppercase tracking-wider text-[#B8AEB2]">
          Featured Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURED_CATEGORIES.map(({ label, icon: Icon }) => {
            const isSelected = selectedCategory.toLowerCase() === label.toLowerCase();
            return (
              <button
                type="button"
                key={label}
                onClick={() =>
                  setSelectedCategory((prev) =>
                    prev.toLowerCase() === label.toLowerCase() ? 'all' : label
                  )
                }
                className={`p-3.5 rounded-xl border text-left transition-colors flex items-center gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#7A1F3D] border-[#F4A6C0] text-[#F5F1F2]'
                    : 'bg-[#17171B] border-[#2C2A2F] text-[#B8AEB2] hover:text-[#F5F1F2] hover:border-[#F4A6C0]/50'
                }`}
              >
                <Icon className="w-4 h-4 text-[#F4A6C0] shrink-0" />
                <span className="text-xs font-medium truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Optional AI Match Assistant (only shown when listings exist) */}
      <FindMyMatch resources={resources} onSelectResource={onSelectResource} />

      {/* Resource Catalog */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#F5F1F2] font-title">
            Available Equipment &amp; Workspaces
          </h2>
          {!isLoading && resources.length > 0 && (
            <span className="text-xs font-mono-code text-[#B8AEB2]">
              Showing {filteredResources.length} of {resources.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-80 rounded-2xl bg-[#17171B] border border-[#2C2A2F] animate-pulse"
              />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="py-16 px-6 text-center rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6 text-[#F4A6C0]" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-[#F5F1F2]">No equipment listed yet</h3>
              <p className="text-sm text-[#B8AEB2]">
                Organizations and workshop owners have not published any equipment or spaces yet.
                {currentUser?.role === 'owner' || currentUser?.role === 'admin'
                  ? ' Add your first listing to make it available for bookings.'
                  : ' Sign in as an organization or owner to publish your first listing.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onStartListEquipment}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#F4A6C0]" />
              <span>List your equipment</span>
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-14 px-6 text-center rounded-2xl bg-[#17171B] border border-[#2C2A2F] space-y-3">
            <h3 className="text-base font-bold text-[#F5F1F2]">No matching listings</h3>
            <p className="text-sm text-[#B8AEB2] max-w-md mx-auto">
              No equipment or workspaces matched your current search or filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] hover:border-[#F4A6C0] text-xs font-medium text-[#F5F1F2] cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <article
                key={resource.id}
                onClick={() => onSelectResource(resource.id)}
                className="group rounded-2xl bg-[#17171B] border border-[#2C2A2F] hover:border-[#F4A6C0] transition-colors overflow-hidden flex flex-col justify-between cursor-pointer cinematic-card-hover"
              >
                <div className="relative h-44 bg-[#0D0D0F] overflow-hidden border-b border-[#2C2A2F]">
                  {resource.photos[0] ? (
                    <img
                      src={resource.photos[0]}
                      alt={resource.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#B8AEB2] gap-2">
                      <Wrench className="w-8 h-8 text-[#7A1F3D]" />
                      <span className="text-xs font-mono-code uppercase">{resource.category}</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono-code text-[#B8AEB2] truncate">
                        {resource.category}
                      </span>
                      <RiskBadge level={resource.riskLevel} />
                    </div>

                    <h3 className="text-base font-bold text-[#F5F1F2] group-hover:text-[#F4A6C0] transition-colors leading-snug">
                      {resource.title}
                    </h3>

                    <p className="text-xs text-[#B8AEB2] line-clamp-2 leading-relaxed">
                      {resource.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#2C2A2F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#B8AEB2]">
                      <MapPin className="w-3.5 h-3.5 text-[#F4A6C0] shrink-0" />
                      <span className="truncate">{resource.location}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[#F5F1F2]">
                        <Clock className="w-3.5 h-3.5 text-[#F4A6C0]" />
                        <span>{getAvailabilitySummary(resource)}</span>
                      </span>

                      <AccessModeBadge
                        priceMode={resource.priceMode}
                        transferMode={resource.transferMode}
                        price={resource.price}
                        currency={resource.currency}
                        priceUnit={resource.priceUnit}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Simple 3-Step How It Works */}
      <section id="how-it-works" className="rounded-2xl bg-[#17171B] border border-[#2C2A2F] p-6 sm:p-8 space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-[#F5F1F2] font-title">
            How it works
          </h2>
          <p className="text-sm text-[#B8AEB2] mt-1">
            A structured workflow so equipment stays safe, well-maintained, and fairly shared.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-2">
            <div className="flex items-center gap-2 text-[#F4A6C0] font-mono-code text-xs uppercase">
              <Search className="w-4 h-4" />
              <span>Step 1</span>
            </div>
            <h3 className="text-base font-semibold text-[#F5F1F2]">
              Browse &amp; check requirements
            </h3>
            <p className="text-xs text-[#B8AEB2] leading-relaxed">
              Filter by category, location, and availability. Review owner-provided safety instructions, accessories, and policies without signing in.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-2">
            <div className="flex items-center gap-2 text-[#F4A6C0] font-mono-code text-xs uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Step 2</span>
            </div>
            <h3 className="text-base font-semibold text-[#F5F1F2]">
              Verify readiness &amp; request
            </h3>
            <p className="text-xs text-[#B8AEB2] leading-relaxed">
              Sign in to pass any required safety assessment or supervisor sign-off, then request an available slot or join the waitlist.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0F] border border-[#2C2A2F] space-y-2">
            <div className="flex items-center gap-2 text-[#F4A6C0] font-mono-code text-xs uppercase">
              <ClipboardCheck className="w-4 h-4" />
              <span>Step 3</span>
            </div>
            <h3 className="text-base font-semibold text-[#F5F1F2]">
              Handover &amp; return safely
            </h3>
            <p className="text-xs text-[#B8AEB2] leading-relaxed">
              Record condition and included accessories at check-out and return so every session ends with clear accountability.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
