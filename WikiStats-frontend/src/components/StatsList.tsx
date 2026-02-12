import { formatDate } from '../lib/wikistats';
import type { StatBucket } from '../types/wikistats';

type StatsListProps = {
  stats: StatBucket[];
  fmt: Intl.NumberFormat;
};

export function StatsList({ stats, fmt }: StatsListProps) {
  return (
    <div id="list">
      <ul>
        {stats.length === 0 ? (
          <li>Keine Daten gefunden.</li>
        ) : (
          stats.map((bucket) => {
            const users = (bucket.userStats ?? []).slice(0, 10);

            return (
              <li key={bucket.intervalStart}>
                <div className="interval">Intervall: {formatDate(bucket.intervalStart)}</div>
                <div className="users">
                  {users.length === 0
                    ? 'Keine Benutzer in diesem Intervall.'
                    : users
                        .map(
                          (u) =>
                            `${u.user}: ${fmt.format(u.count)} (${u.delta >= 0 ? '+' : ''}${fmt.format(u.delta)})`
                        )
                        .join(' · ')}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
