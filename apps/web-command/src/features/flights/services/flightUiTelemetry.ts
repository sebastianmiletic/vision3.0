export function setFlightUiStatus(status: string, count: number) {
  const countNode = document.getElementById('flightCount');
  if (countNode) {
    countNode.textContent = String(count);
  }

  const statusNode = document.getElementById('flightStatus');
  if (statusNode) {
    statusNode.textContent = status;
  }
}
