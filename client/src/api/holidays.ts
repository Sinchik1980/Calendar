import axios from 'axios';
import type { Holiday } from '../types';

const NAGER_API = 'https://date.nager.at/api/v3';

export const fetchHolidays = async (year: number, countryCode: string = 'UA'): Promise<Holiday[]> => {
  const { data } = await axios.get<Holiday[]>(`${NAGER_API}/PublicHolidays/${year}/${countryCode}`);
  return data;
};
