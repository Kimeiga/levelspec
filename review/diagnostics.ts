import { escapeXML } from "../src/vector/xml.ts";
import type { Diagnostic, ReviewFinding } from "../src/vector/types.ts";

/** Renders validation diagnostics and owns selection for spatial diagnostic links. */
export function diagnosticPanel(
  host: HTMLElement,
  actions: {
    inspect: (finding: ReviewFinding, frame: boolean) => void;
    restore: () => void;
    cutaway: (finding: ReviewFinding) => void;
  },
) {
  let selected = new URL(location.href).searchParams.get("diagnostic") ?? "";
  let enabled = false;
  let first = true;
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");
  /** Publishes a spatial inspection without changing source or validation. */
  function inspect(diagnostic: Diagnostic, frame = true) {
    if (!enabled || !diagnostic.review) return;
    selected = diagnostic.review.id;
    actions.inspect(
      {
        ...diagnostic.review,
        objects: diagnostic.objects,
        code: diagnostic.code,
      },
      frame,
    );
    const url = new URL(location.href);
    url.searchParams.delete("suggestion");
    url.searchParams.set("diagnostic", selected);
    history.replaceState(null, "", url);
    notice.textContent = `Inspecting ${diagnostic.code}: ${diagnostic.objects.join(", ")}`;
    first = false;
  }
  /** Copies a review acknowledgment, with selectable text if clipboard access fails. */
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notice.textContent = "Copied.";
    } catch {
      const text = document.createElement("textarea");
      text.readOnly = true;
      text.value = value;
      host.append(text);
      text.select();
      notice.textContent = "Clipboard unavailable. Select and copy the text below.";
    }
  }
  /** Makes stale-preview controls inert. */
  function button(label: string, action: () => void) {
    const node = document.createElement("button");
    node.textContent = label;
    node.disabled = !enabled;
    node.onclick = action;
    return node;
  }
  return {
    /** Reconciles source-linked errors across progressive compile results. */
    update(diagnostics: Diagnostic[], complete: boolean) {
      selected = new URL(location.href).searchParams.get("diagnostic") ?? "";
      host.replaceChildren(notice);
      const parameters = new URL(location.href).searchParams;
      if (parameters.has("diagnostic") && parameters.has("suggestion")) {
        notice.textContent = "Choose either a diagnostic or a suggestion link.";
        selected = "";
      }
      for (const diagnostic of diagnostics) {
        const row = document.createElement("article"),
          text = document.createElement("p");
        text.textContent = `${diagnostic.severity} / ${diagnostic.code}: ${diagnostic.message}${diagnostic.source ? ` (line ${diagnostic.source.line})` : ""}`;
        row.append(text);
        if (diagnostic.review) {
          row.dataset.diagnostic = diagnostic.review.id;
          row.append(
            button("Inspect", () => inspect(diagnostic)),
            button("Cutaway", () => {
              inspect(diagnostic);
              actions.cutaway({
                ...diagnostic.review!,
                objects: diagnostic.objects,
                code: diagnostic.code,
              });
            }),
            button("Copy review link", () => {
              const url = new URL(location.href);
              url.searchParams.delete("suggestion");
              url.searchParams.set("diagnostic", diagnostic.review!.id);
              for (const key of ["camera", "target", "view-height", "fov", "roll"])
                url.searchParams.delete(key);
              void navigator.clipboard.writeText(url.href).then(
                () => {
                  notice.textContent = "Copied.";
                },
                () => {
                  notice.textContent = url.href;
                },
              );
            }),
          );
        }
        if (diagnostic.suggestion) row.append(button("Copy suppression XML", () => {
          const finding = diagnostic.suggestion!;
          void copy(`<review-suppression suggestion="${escapeXML(finding.id)}" fingerprint="${escapeXML(finding.fingerprint)}" reason="REPLACE WITH REVIEW REASON"/>`);
        }));
        host.append(row);
      }
      host.append(
        button("Restore previous view", () => {
          selected = "";
          const url = new URL(location.href);
          url.searchParams.delete("diagnostic");
          history.replaceState(null, "", url);
          actions.restore();
        }),
      );
      if (selected) {
        const diagnostic = diagnostics.find((d) => d.review?.id === selected);
        if (diagnostic) inspect(diagnostic, first && !parameters.has("camera"));
        else if (!complete) {
          notice.textContent = "Waiting for validation diagnostics…";
        } else {
          notice.textContent =
            "This diagnostic no longer exists in the current layout.";
          actions.restore();
          selected = "";
        }
      }
    },
    /** Disables inspection against stale geometry. */
    setEnabled(value: boolean) {
      enabled = value;
      host
        .querySelectorAll("button")
        .forEach((node) => (node.disabled = !value));
    },
  };
}
