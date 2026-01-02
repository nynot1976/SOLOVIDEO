import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Filter, X, SlidersHorizontal, Calendar, Star, Tag, ArrowUpDown } from "lucide-react";
import { MediaItem } from "@/lib/emby-client";

interface ContentFiltersProps {
  items: MediaItem[];
  onFilteredItemsChange: (filteredItems: MediaItem[]) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

interface FilterState {
  genre: string;
  year: string;
  rating: string;
  type: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function ContentFilters({ items, onFilteredItemsChange, searchTerm, onSearchChange }: ContentFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    genre: '',
    year: '',
    rating: '',
    type: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Extract unique values for filter options
  const getUniqueGenres = () => {
    const genres = new Set<string>();
    items.forEach(item => {
      if (item.genres) {
        item.genres.forEach(genre => genres.add(genre));
      }
    });
    return Array.from(genres).sort();
  };

  const getUniqueYears = () => {
    const years = new Set<number>();
    items.forEach(item => {
      if (item.year) {
        years.add(item.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getUniqueTypes = () => {
    const types = new Set<string>();
    items.forEach(item => {
      if (item.type) {
        types.add(item.type);
      }
    });
    return Array.from(types).sort();
  };

  const getRatingRanges = () => [
    { value: '9-10', label: '★★★★★ (9-10)' },
    { value: '8-9', label: '★★★★☆ (8-9)' },
    { value: '7-8', label: '★★★☆☆ (7-8)' },
    { value: '6-7', label: '★★☆☆☆ (6-7)' },
    { value: '0-6', label: '★☆☆☆☆ (<6)' }
  ];

  // Filter and sort items
  useEffect(() => {
    let filteredItems = [...items];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.overview && item.overview.toLowerCase().includes(searchLower)) ||
        (item.genres && item.genres.some(genre => genre.toLowerCase().includes(searchLower)))
      );
    }

    // Apply genre filter
    if (filters.genre) {
      filteredItems = filteredItems.filter(item =>
        item.genres && item.genres.includes(filters.genre)
      );
    }

    // Apply year filter
    if (filters.year) {
      filteredItems = filteredItems.filter(item =>
        item.year && item.year.toString() === filters.year
      );
    }

    // Apply type filter
    if (filters.type) {
      filteredItems = filteredItems.filter(item =>
        item.type === filters.type
      );
    }

    // Apply rating filter
    if (filters.rating) {
      const [min, max] = filters.rating.split('-').map(Number);
      filteredItems = filteredItems.filter(item => {
        if (!item.rating) return filters.rating === '0-6';
        return item.rating >= min && item.rating < max;
      });
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'runtime':
          aValue = a.runtime || 0;
          bValue = b.runtime || 0;
          break;
        case 'playCount':
          aValue = a.playCount || 0;
          bValue = b.playCount || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    onFilteredItemsChange(filteredItems);
  }, [items, searchTerm, filters, onFilteredItemsChange]);

  const clearAllFilters = () => {
    setFilters({
      genre: '',
      year: '',
      rating: '',
      type: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    onSearchChange('');
  };

  const hasActiveFilters = searchTerm || filters.genre || filters.year || filters.rating || filters.type || filters.sortBy !== 'name';

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filters.genre) count++;
    if (filters.year) count++;
    if (filters.rating) count++;
    if (filters.type) count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar contenido..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Button
          variant={isFiltersOpen ? "default" : "outline"}
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="h-12 px-4 relative"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              {searchTerm}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onSearchChange('')} />
            </Badge>
          )}
          {filters.genre && (
            <Badge variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" />
              {filters.genre}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, genre: '' }))} />
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {filters.year}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, year: '' }))} />
            </Badge>
          )}
          {filters.rating && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />
              {getRatingRanges().find(r => r.value === filters.rating)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, rating: '' }))} />
            </Badge>
          )}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              {filters.type}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, type: '' }))} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2">
            <X className="h-3 w-3 mr-1" />
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {isFiltersOpen && (
        <Card className="p-4 space-y-4 border-dashed">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Genre Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Género
              </label>
              <Select value={filters.genre} onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los géneros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los géneros</SelectItem>
                  {getUniqueGenres().map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Año
              </label>
              <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los años</SelectItem>
                  {getUniqueYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Star className="h-3 w-3" />
                Calificación
              </label>
              <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las calificaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las calificaciones</SelectItem>
                  {getRatingRanges().map(range => (
                    <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Tipo
              </label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  {getUniqueTypes().map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                Ordenar por
              </label>
              <div className="flex gap-1">
                <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Nombre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nombre</SelectItem>
                    <SelectItem value="year">Año</SelectItem>
                    <SelectItem value="rating">Calificación</SelectItem>
                    <SelectItem value="runtime">Duración</SelectItem>
                    <SelectItem value="playCount">Reproducciones</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                  }))}
                  className="px-2"
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>

          {/* Clear All Button */}
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={clearAllFilters} size="sm">
              <X className="h-3 w-3 mr-1" />
              Limpiar todos los filtros
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}