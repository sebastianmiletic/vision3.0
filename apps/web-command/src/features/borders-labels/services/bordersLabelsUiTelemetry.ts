export function setBordersLabelsUiStatus(status: string, count: number) {
  const countNode = document.getElementById('bordersLabelsCount');
  if (countNode) {
    countNode.textContent = String(count);
  }

  const statusNode = document.getElementById('bordersLabelsStatus');
  if (statusNode) {
    statusNode.textContent = status;
  }
}
