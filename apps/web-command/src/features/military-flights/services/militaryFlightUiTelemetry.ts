import { setText } from '../../legacy-shell/utils/domUi';

export function setMilitaryFlightUiStatus(statusText: string, count: number) {
  setText('militaryStatus', statusText);
  setText('militaryCount', `${count}`);
}
