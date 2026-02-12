import type { StatusState } from '../types/wikistats';

type StatusBannerProps = {
  status: StatusState;
};

export function StatusBanner({ status }: StatusBannerProps) {
  return (
    <div id="status" className={status.error ? 'err' : 'ok'}>
      {status.message}
    </div>
  );
}
