import {useMemo, useRef, useState} from 'preact/hooks';
import {FilterForm} from './components/FilterForm';
import {StatusBanner} from './components/StatusBanner';
import {PreviewCard} from './components/PreviewCard';
import {StatsList} from './components/StatsList';
import {ChartsPanel} from './components/charts/ChartsPanel';
import {useWikiStatsData} from './hooks/useWikiStatsData';
import {useCharts} from './hooks/useCharts';
import type {Article, FormState, Interval} from './types/wikistats';
import {restoreFormState} from "./lib/wikistats";

export function App() {
    const fmt = useMemo(() => new Intl.NumberFormat(undefined), []);

    const [queryState, setQueryState] = useState<FormState>(restoreFormState);

    // useEffect(() => {
    //     localStorage.setItem('wikistats.form', JSON.stringify(formState));
    // }, [formState]);

    const {status, loading, preview, visibleStats} = useWikiStatsData(queryState, fmt);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const deltaCanvasRef = useRef<HTMLCanvasElement>(null);

    useCharts({
        chartCanvasRef,
        deltaCanvasRef,
        visibleStats,
        topN: Number(queryState.topN) || 6
    });

    const handleArticleChange = (article: Article) => {
        setQueryState((prev) => ({...prev, article}));
    };

    const handleIntervalChange = (interval: Interval) => {
        setQueryState((prev) => ({...prev, interval}));
    };

    const handleTopNChange = (topN: string) => {
        setQueryState((prev) => ({...prev, topN}));
    };

    const handleRangeChange = (range: string) => {
        setQueryState((prev) => ({...prev, range}));
    };

    return (
        <>
            <h1>WikiStats</h1>

            <FilterForm
                queryState={queryState}
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
