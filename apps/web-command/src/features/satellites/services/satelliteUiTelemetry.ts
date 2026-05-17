export function setSatelliteUiStatus(status: string, count: number) {
  const countNode = document.getElementById('satCount');
  if (countNode) {
    countNode.textContent = String(count);
  }

  const statusNode = document.getElementById('satStatus');
  if (statusNode) {
    statusNode.textContent = status;
  }
}
