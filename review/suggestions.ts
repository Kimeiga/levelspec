import type { CompiledLevel, Suggestion } from "../src/vector/types.ts";
import { escapeXML } from "../src/vector/xml.ts";

interface SuggestionActions {
  inspect: (suggestion: Suggestion, frame: boolean) => void;
  restore: () => void;
  cutaway: (suggestion: Suggestion) => void;
}

/** Owns read-only finding controls; spatial changes are delegated to the reviewer. */
export function suggestionPanel(host: HTMLElement, actions: SuggestionActions) {
  let level: CompiledLevel | undefined;
  let enabled = false;
  let selected = new URL(location.href).searchParams.get("suggestion") ?? "";
  let initial = true;
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");

  /** Selects a finding without invoking any source edits. */
  function inspect(suggestion: Suggestion, frame = true) {
    if (!enabled) return;
    selected = suggestion.id;
    actions.inspect(suggestion, frame);
    const url = new URL(location.href);
    url.searchParams.delete("diagnostic");
    url.searchParams.set("suggestion", selected);
    history.replaceState(null, "", url);
    notice.textContent = `Inspecting ${suggestion.code}: ${suggestion.objects.join(", ")}`;
  }
  /** Copies review data, exposing failures without unhandled browser rejections. */
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notice.textContent = "Copied.";
    } catch {
      notice.textContent =
        "Clipboard unavailable. Select and copy the text below.";
      const text = document.createElement("textarea");
      text.readOnly = true;
      text.value = value;
      host.append(text);
      text.select();
    }
  }
  /** Creates keyboard-accessible controls that honor stale-preview state. */
  function button(label: string, action: () => void) {
    const button = document.createElement("button");
    button.textContent = label;
    button.disabled = !enabled;
    button.onclick = action;
    return button;
  }
  /** Renders all findings while keeping suppressions separate from active review work. */
  function render() {
    host.replaceChildren(notice);
    if (!level) return;
    const active = level.suggestions.filter((s) => s.state === "active");
    const count = document.createElement("p");
    count.textContent = `${active.length} active suggestions · does not affect validation`;
    host.append(count);
    const suppressed = document.createElement("details"),
      summary = document.createElement("summary");
    summary.textContent = `Suppressed (${level.suggestions.length - active.length})`;
    suppressed.append(summary);
    for (const suggestion of level.suggestions) {
      const row = document.createElement("article");
      row.className = "suggestion";
      row.dataset.suggestion = suggestion.id;
      const message = document.createElement("p");
      message.textContent = suggestion.message;
      const source = document.createElement("p");
      source.className = "suggestion-source";
      source.textContent = suggestion.sources
        .map((s) => `${s.object}${s.source ? ` / line ${s.source.line}` : ""}`)
        .join(" · ");
      const controls = document.createElement("div");
      controls.className = "suggestion-actions";
      controls.append(
        button("Inspect", () => inspect(suggestion)),
        button("Cutaway", () => {
          inspect(suggestion);
          actions.cutaway(suggestion);
        }),
        button("Copy review link", () => {
          const url = new URL(location.href);
          url.searchParams.set("suggestion", suggestion.id);
          for (const key of ["camera", "target", "view-height", "fov", "roll"])
            url.searchParams.delete(key);
          void copy(url.href);
        }),
        button("Copy suppression XML", () => {
          const annotation = `<review-suppression suggestion="${escapeXML(suggestion.id)}" fingerprint="${suggestion.fingerprint}" reason="REPLACE WITH REVIEW REASON"/>`;
          void copy(annotation);
        }),
      );
      row.append(message, source, controls);
      if (suggestion.suppression) {
        const reason = document.createElement("p");
        reason.textContent = `${suggestion.suppression.stale ? "Geometry changed; review again" : "Reviewed"}: ${suggestion.suppression.reason}`;
        row.append(reason);
      }
      (suggestion.state === "active" ? host : suppressed).append(row);
    }
    host.append(
      suppressed,
      button("Restore previous view", () => {
        selected = "";
        const url = new URL(location.href);
        url.searchParams.delete("suggestion");
        history.replaceState(null, "", url);
        actions.restore();
        notice.textContent = "Previous view restored.";
      }),
    );
  }
  return {
    /** Reconciles the selected logical finding across progressive compilation replies. */
    update(next: CompiledLevel) {
      const parameters = new URL(location.href).searchParams;
      selected = parameters.has("diagnostic") ? "" : parameters.get("suggestion") ?? "";
      level = next;
      render();
      if (selected) {
        const suggestion = level.suggestions.find((s) => s.id === selected);
        if (suggestion) {
          const explicit = new URL(location.href).searchParams.has("camera");
          inspect(suggestion, initial && !explicit);
        } else if (
          selected.startsWith("NAV_ISLAND:") ||
          selected.startsWith("FLIGHT_NAV_MISSING:")
        ) {
          if (level.navigationSuggestionsStatus === "pending") {
            notice.textContent = "Waiting for walking navigation analysis…";
            return;
          }
          notice.textContent =
            level.navigationSuggestionsStatus === "unavailable"
              ? "Walking navigation analysis is unavailable."
              : "This suggestion no longer exists in the current layout.";
          actions.restore();
          selected = "";
        } else {
          notice.textContent =
            "This suggestion no longer exists in the current layout.";
          actions.restore();
          selected = "";
        }
      }
      initial = false;
    },
    /** Prevents inspection and clipboard actions against stale source revisions. */
    setEnabled(value: boolean) {
      enabled = value;
      host
        .querySelectorAll("button")
        .forEach((button) => (button.disabled = !value));
    },
  };
}
