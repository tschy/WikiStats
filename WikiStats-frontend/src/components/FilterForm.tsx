import type {Article, FormState, Interval} from '../types/wikistats';

type FilterFormProps = {
    queryState: FormState;
    loading: boolean;
    onArticleChange: (value: Article) => void;
    onIntervalChange: (value: Interval) => void;
    onTopNChange: (value: string) => void;
    onRangeChange: (value: string) => void;
};

export function FilterForm({
                               queryState,
                               loading,
                               onArticleChange,
                               onIntervalChange,
                               onTopNChange,
                               onRangeChange
                           }: FilterFormProps) {
    return (
        <form>
            <label>
                Artikel
                <select
                    disabled={loading}
                    value={queryState.article}
                    onChange={(e) => onArticleChange((e.currentTarget as HTMLSelectElement).value as Article)}
                >
                    <option value="earth">Earth</option>
                    <option value="moon">Moon</option>
                    <option value="horse">Horse</option>
                </select>
            </label>

            <label>
                Intervall
                <select
                    value={queryState.interval}
                    disabled={loading}
                    onChange={(e) => onIntervalChange((e.currentTarget as HTMLSelectElement).value as Interval)}
                >
                    <option value="daily">Täglich</option>
                    <option value="weekly">Wöchentlich</option>
                    <option value="monthly">Monatlich</option>
                    <option value="yearly">Jährlich</option>
                </select>
            </label>

            <label>
                Top-N Nutzer
                <select value={queryState.topN}
                        onChange={(e) => onTopNChange((e.currentTarget as HTMLSelectElement).value)}>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                </select>
            </label>

            <label>
                Sichtbare Intervalle
                <select value={queryState.range}
                        onChange={(e) => onRangeChange((e.currentTarget as HTMLSelectElement).value)}>
                    <option value="all">Alle</option>
                    <option value="5">Letzte 5</option>
                    <option value="10">Letzte 10</option>
                    <option value="20">Letzte 20</option>
                    <option value="50">Letzte 50</option>
                </select>
            </label>

        </form>
    );
}
