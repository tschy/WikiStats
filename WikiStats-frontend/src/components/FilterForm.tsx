import type { Article, FormState, Interval } from '../types/wikistats';

type FilterFormProps = {
  formState: FormState;
  loading: boolean;
  onSubmit: () => void;
  onArticleChange: (value: Article) => void;
  onIntervalChange: (value: Interval) => void;
  onTopNChange: (value: string) => void;
  onRangeChange: (value: string) => void;
};

export function FilterForm({
  formState,
  loading,
  onSubmit,
  onArticleChange,
  onIntervalChange,
  onTopNChange,
  onRangeChange
}: FilterFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Artikel
        <select
          value={formState.article}
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
          value={formState.interval}
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
        <select value={formState.topN} onChange={(e) => onTopNChange((e.currentTarget as HTMLSelectElement).value)}>
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="8">8</option>
          <option value="10">10</option>
        </select>
      </label>

      <label>
        Sichtbare Intervalle
        <select value={formState.range} onChange={(e) => onRangeChange((e.currentTarget as HTMLSelectElement).value)}>
          <option value="all">Alle</option>
          <option value="5">Letzte 5</option>
          <option value="10">Letzte 10</option>
          <option value="20">Letzte 20</option>
          <option value="50">Letzte 50</option>
        </select>
      </label>

      <button type="submit" disabled={loading}>
        Laden
      </button>
    </form>
  );
}
