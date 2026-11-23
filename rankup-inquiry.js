// Connect the visitor's chosen configuration to their existing inquiry draft.
(() => {
  function initialize() {
    const siteOrigins = ["https://www.aik.co.kr", "https://aik.co.kr", "https://en.aik.co.kr"];
    const live = siteOrigins.includes(location.origin);
    if (live && location.pathname === "/board/inquiry.html" && location.hostname !== "en.aik.co.kr") {
      location.replace("/board/write.html?pid=57&fno=8");
      return;
    }
    const isInquiry = new URLSearchParams(location.search).get("fno") === "8";
    const writePage = live && isInquiry && location.pathname === "/board/write.html";
    const listPage = live && isInquiry && location.pathname === "/board/list.html";
    const preview = !live && document.getElementById("inqForm");
    if (!writePage && !listPage && !preview) return;

    const english = document.documentElement.lang === "en" || location.hostname === "en.aik.co.kr" || location.pathname.includes("/en/");
    const label = (ko, en) => english ? en : ko;
    const site = "https://skjang-ai.github.io";
    const advisorUrl = site + "/aik-aidc-quote-demo/?embed=1&inquiry=1&lang=" + (english ? "en" : "ko");
    const form = preview || document.getElementById("save_form");
    const field = form?.elements.namedItem(preview ? "message" : "f7");
    const subject = form?.elements.namedItem("subject");
    let panel = document.getElementById("aik-quote-inquiry");
    if (panel?.dataset.connected || (!listPage && !field)) return;
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "aik-quote-inquiry";
      if (listPage) {
        const content = document.getElementById("p_content_box");
        if (!content) return;
        content.prepend(panel);
      } else {
        form.before(panel);
      }
    }
    panel.dataset.connected = "1";
    panel.style.cssText = "margin:20px 0;padding:16px 18px;border:1px solid #c8d8e8;border-radius:8px;background:#f5f9fd;color:#173e66;text-align:left;box-sizing:border-box;max-width:100%";
    if (listPage) {
      for (const existing of document.querySelectorAll('#p_content_box a[href*="write.html"]')) {
        const target = new URL(existing.href, location.href);
        if (target.origin === location.origin && target.pathname === "/board/write.html" &&
            target.searchParams.get("fno") === "8" && !target.searchParams.has("pid")) {
          target.searchParams.set("pid", "57");
          existing.href = target.href;
        }
      }
      const link = document.createElement("a");
      link.href = "/board/write.html?pid=57&fno=8";
      link.textContent = label("AI 상담 · 견적문의 작성하기", "AI consultation and quote inquiry");
      link.style.cssText = "font-size:17px;font-weight:700;color:#174e87";
      panel.replaceChildren(link);
      return;
    }

    let frame = panel.querySelector("iframe");
    if (!frame || frame.src !== advisorUrl) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = label("AI 견적 상담 열기", "Open the AI quote advisor");
      summary.style.cssText = "cursor:pointer;font-size:17px;font-weight:700";
      frame = document.createElement("iframe");
      frame.title = label("AI 서버 견적 상담", "AI server quote advisor");
      frame.loading = "lazy";
      frame.allow = "clipboard-write";
      frame.style.cssText = "display:block;width:100%;height:clamp(460px,75vh,760px);margin-top:12px;border:0;background:white";
      frame.src = advisorUrl;
      details.append(summary, frame);
      panel.replaceChildren(details);
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.style.margin = "6px 0 0";
    panel.append(status);
    const send = type => frame.contentWindow?.postMessage({type, version:2}, site);
    frame.addEventListener("load", () => send("aik-inquiry-ready"));
    let lastBody = "";
    let lastContent = "";
    window.addEventListener("message", event => {
      if (event.origin !== site || event.source !== frame.contentWindow) return;
      const message = event.data;
      if (message?.type === "aik-inquiry-hello") {
        send("aik-inquiry-ready");
        return;
      }
      if (message?.type !== "aik-inquiry-use" || typeof message.body !== "string" ||
          typeof message.subject !== "string" || !message.body.trim() || message.body.length > 16000 ||
          !message.subject.trim() || message.subject.length > 180) return;
      const editor = window.oEditors?.getById?.[field.name];
      if (!preview && field.getAttribute("type") === "editor" && !editor) {
        send("aik-inquiry-manual");
        return;
      }
      const current = editor ? editor.getIR() : field.value;
      if (message.body !== lastBody || current !== lastContent) {
        if (editor) {
          const block = document.createElement("p");
          const lines = message.body.split(/\r?\n/);
          for (let index = 0; index < lines.length; index++) {
            if (index) block.append(document.createElement("br"));
            block.append(document.createTextNode(lines[index]));
          }
          editor.setIR(current + block.outerHTML);
          editor.exec("UPDATE_CONTENTS_FIELD", []);
          lastContent = editor.getIR();
        } else {
          const value = current ? current.trimEnd() + "\n\n" + message.body : message.body;
          if (field.maxLength >= 0 && value.length > field.maxLength) {
            send("aik-inquiry-manual");
            return;
          }
          field.value = value;
          lastContent = field.value;
        }
        lastBody = message.body;
        field.dispatchEvent(new Event("input", {bubbles:true}));
      }
      if (subject && !subject.value.trim()) {
        subject.value = message.subject;
        subject.dispatchEvent(new Event("input", {bubbles:true}));
      }
      send("aik-inquiry-applied");
      status.textContent = label("추천 사양을 문의 내용에 담았습니다. 연락처와 내용을 확인한 뒤 접수해 주세요.",
        "Your configuration was added. Review the inquiry and your contact details, then submit it.");
      const details = frame.closest("details");
      if (details) details.open = false;
      const next = form.querySelector('input[name="name"], input[name="company"], input[type="text"]');
      next?.focus({preventScroll:true});
      form.scrollIntoView({block:"start"});
    });
    send("aik-inquiry-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once:true});
  else initialize();
})();
