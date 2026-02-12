import { useCallback, useEffect, useState } from 'preact/hooks';
import type { FormState } from '../types/wikistats';
import { restoreFormState } from '../lib/wikistats';

export function useFormState() {
  const [formState, setFormState] = useState<FormState>(restoreFormState);
  const [queryState, setQueryState] = useState<FormState>(restoreFormState);

  useEffect(() => {
    localStorage.setItem('wikistats.form', JSON.stringify(formState));
  }, [formState]);

  const submitFilters = useCallback(() => {
    setQueryState(formState);
  }, [formState]);

  return {
    formState,
    setFormState,
    queryState,
    setQueryState,
    submitFilters
  };
}
