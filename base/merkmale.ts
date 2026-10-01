import { RollenMerkmal } from './api/rolleApi';

export const befristungPflicht: RollenMerkmal = 'BEFRISTUNG_PFLICHT';
export const kopersNrPflicht: RollenMerkmal = 'KOPERS_PFLICHT';

export const rollenMerkmalLabel: Record<RollenMerkmal, string> = {
  BEFRISTUNG_PFLICHT: 'Befristung ist Pflichtangabe',
  KOPERS_PFLICHT: 'KoPers.-Nr. ist Pflichtangabe',
  MPT_ROLLE: 'Ist MPT-Rolle',
};
