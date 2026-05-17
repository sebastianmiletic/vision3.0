import { useEffect } from 'react';

import { extractExifMetadata } from '../../addons/metadata-spoofing/exifMetadataService';
import { setText } from '../utils/domUi';

function renderSummary(summary: Array<{ label: string; value: string }>) {
  return summary
    .map(
      (item) => `
      <article class="metadata-summary-card">
        <span class="label">${item.label}</span>
        <span class="value">${item.value}</span>
      </article>
    `,
    )
    .join('');
}

function renderTags(tags: Array<{ key: string; value: string }>) {
  if (!tags.length) {
    return '<p class="metadata-tag-value">No EXIF tags detected in this file.</p>';
  }

  return tags
    .map(
      (tag) => `
      <article class="metadata-tag-row">
        <span class="metadata-tag-key">${tag.key}</span>
        <span class="metadata-tag-value">${tag.value}</span>
      </article>
    `,
    )
    .join('');
}

function setDisabled(id: string, disabled: boolean) {
  const node = document.getElementById(id) as HTMLButtonElement | null;
  if (node) {
    node.disabled = disabled;
  }
}

function resetMetadataOutput() {
  const summaryNode = document.getElementById('metadataSummaryGrid');
  const tagsNode = document.getElementById('metadataTagList');
  const rawNode = document.getElementById('metadataRawJson');
  if (summaryNode) {
    summaryNode.innerHTML = '';
  }

  if (tagsNode) {
    tagsNode.innerHTML = '<p class="metadata-tag-value">No metadata parsed yet.</p>';
  }

  if (rawNode) {
    rawNode.textContent = 'No metadata parsed yet.';
  }

  setText('metadataFileName', 'No file loaded.');
  setText('metadataStatus', 'Ready. Upload a JPG/PNG/HEIC image.');
  setDisabled('metadataCopyJsonBtn', true);
  setDisabled('metadataClearBtn', true);
}

export function useLegacyMetadataSpoofingAddon() {
  useEffect(() => {
    const uploadInput = document.getElementById('metadataUploadInput') as HTMLInputElement | null;
    const uploadTrigger = document.getElementById('metadataUploadTriggerBtn') as HTMLButtonElement | null;
    const summaryNode = document.getElementById('metadataSummaryGrid');
    const tagsNode = document.getElementById('metadataTagList');
    const rawNode = document.getElementById('metadataRawJson');
    const copyButton = document.getElementById('metadataCopyJsonBtn') as HTMLButtonElement | null;
    const clearButton = document.getElementById('metadataClearBtn') as HTMLButtonElement | null;
    if (!uploadInput || !uploadTrigger || !summaryNode || !tagsNode || !rawNode || !copyButton || !clearButton) {
      return;
    }

    let currentRawJson = '';
    resetMetadataOutput();

    const onUploadTrigger = () => uploadInput.click();

    const onFileChange = async () => {
      const file = uploadInput.files?.[0];
      if (!file) {
        return;
      }

      setText('metadataStatus', 'Extracting EXIF metadata...');
      setText('metadataFileName', `${file.name} · ${Math.round(file.size / 1024)} KB`);

      try {
        const report = await extractExifMetadata(file);
        summaryNode.innerHTML = renderSummary(report.summary);
        tagsNode.innerHTML = renderTags(report.tags);
        rawNode.textContent = report.rawJson;
        currentRawJson = report.rawJson;

        setDisabled('metadataCopyJsonBtn', false);
        setDisabled('metadataClearBtn', false);
        setText('metadataStatus', `Extracted ${report.tags.length} EXIF tags.`);
      } catch (error) {
        console.error('Metadata extraction failed', error);
        setText('metadataStatus', 'Failed to parse metadata. Try another image format.');
      }
    };

    const onCopyJson = async () => {
      if (!currentRawJson) {
        return;
      }

      try {
        await navigator.clipboard.writeText(currentRawJson);
        setText('metadataStatus', 'Raw metadata JSON copied to clipboard.');
      } catch (error) {
        console.error('Clipboard copy failed', error);
        setText('metadataStatus', 'Clipboard copy failed on this browser context.');
      }
    };

    const onClear = () => {
      uploadInput.value = '';
      currentRawJson = '';
      resetMetadataOutput();
    };

    uploadTrigger.addEventListener('click', onUploadTrigger);
    uploadInput.addEventListener('change', onFileChange);
    copyButton.addEventListener('click', onCopyJson);
    clearButton.addEventListener('click', onClear);

    return () => {
      uploadTrigger.removeEventListener('click', onUploadTrigger);
      uploadInput.removeEventListener('change', onFileChange);
      copyButton.removeEventListener('click', onCopyJson);
      clearButton.removeEventListener('click', onClear);
    };
  }, []);
}
