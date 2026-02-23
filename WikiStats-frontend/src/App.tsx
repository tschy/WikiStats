import {useMemo, useRef, useState} from 'preact/hooks';
import {FilterForm} from './components/FilterForm';
import {StatusBanner} from './components/StatusBanner';
import {PreviewCard} from './components/PreviewCard';
import {StatsList} from './components/StatsList';
import {ChartsPanel} from './components/charts/ChartsPanel';
import {useWikiStatsData} from './hooks/useWikiStatsData';
import {useCharts} from './hooks/useCharts';
import type {Article, FormState, Interval} from './types/wikistats';
import { DEFAULT_FORM_STATE } from './types/wikistats';

export function App() {
    const fmt = useMemo(() => new Intl.NumberFormat(undefined), []);

    const [filters, setFilters] = useState<FormState>(DEFAULT_FORM_STATE);

    const {status, loading, preview, visibleStats} = useWikiStatsData(filters, fmt);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const deltaCanvasRef = useRef<HTMLCanvasElement>(null);

    useCharts({
        chartCanvasRef,
        deltaCanvasRef,
        visibleStats,
        topN: Number(filters.topN) || 6
    });

    const handleArticleChange = (article: Article) => {
        setFilters((prev) => ({...prev, article}));
    };

    const handleIntervalChange = (interval: Interval) => {
        setFilters((prev) => ({...prev, interval}));
    };

    const handleTopNChange = (topN: string) => {
        setFilters((prev) => ({...prev, topN}));
    };

    const handleRangeChange = (range: string) => {
        setFilters((prev) => ({...prev, range}));
    };

    return (
        <>
            <h1>WikiStats</h1>

            <FilterForm
                filters={filters}
                loading={loading}
                onArticleChange={handleArticleChange}
                onIntervalChange={handleIntervalChange}
                onTopNChange={handleTopNChange}
                onRangeChange={handleRangeChange}
            />

            <StatusBanner status={status}/>

            <ChartsPanel chartCanvasRef={chartCanvasRef} deltaCanvasRef={deltaCanvasRef}/>

            <PreviewCard preview={preview}/>

            <StatsList stats={visibleStats} fmt={fmt}/>
        </>
    );
}
