export const ART_DEBUG_PAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>主界面美术调参页</title>
  <style>
    :root {
      --bg: #fdf5ec;
      --panel: rgba(255, 250, 243, 0.92);
      --panel-strong: #fffaf4;
      --line: #ebcfb4;
      --text: #6e4a33;
      --muted: #9c7b63;
      --brand: #f79b34;
      --brand-soft: rgba(247, 155, 52, 0.14);
      --shadow: 0 18px 36px rgba(187, 129, 62, 0.12);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.88) 0%, transparent 30%),
        radial-gradient(circle at bottom right, rgba(255,225,192,0.55) 0%, transparent 28%),
        linear-gradient(180deg, #fcf2e6 0%, #f6e6d4 100%);
      color: var(--text);
      padding: 18px;
    }

    .app {
      max-width: 960px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 26px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .hero {
      padding: 22px 24px 16px;
      border-bottom: 1px solid rgba(235, 207, 180, 0.72);
      background: linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,248,241,0.78) 100%);
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.2;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding: 16px 24px 0;
    }

    .toolbar button {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: var(--panel-strong);
      color: var(--text);
      font-size: 14px;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px rgba(235, 207, 180, 0.95);
    }

    .toolbar button.primary {
      background: linear-gradient(180deg, #ffb760 0%, #f79b34 100%);
      color: #fff;
      box-shadow: 0 10px 20px rgba(247, 155, 52, 0.24);
    }

    .status {
      padding: 10px 24px 0;
      color: var(--muted);
      font-size: 12px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      padding: 18px 24px 24px;
    }

    .section {
      background: rgba(255,255,255,0.62);
      border: 1px solid rgba(235, 207, 180, 0.9);
      border-radius: 22px;
      padding: 16px;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 12px;
    }

    .section h2 {
      margin: 0;
      font-size: 17px;
    }

    .section-toggle {
      width: 34px;
      height: 28px;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 250, 243, 0.92);
      color: var(--brand);
      cursor: pointer;
      font-size: 15px;
      line-height: 28px;
      box-shadow: inset 0 0 0 1px rgba(235, 207, 180, 0.95);
    }

    .section-body[hidden] {
      display: none;
    }

    .section.is-collapsed {
      padding-bottom: 12px;
    }

    .section.is-collapsed .section-head {
      margin-bottom: 0;
    }

    .field {
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 250, 243, 0.9);
      box-shadow: inset 0 0 0 1px rgba(242, 221, 200, 0.9);
    }

    .field + .field {
      margin-top: 10px;
    }

    .field-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .field-title {
      font-size: 14px;
      font-weight: 700;
    }

    .field-value {
      font-size: 12px;
      color: var(--brand);
      font-variant-numeric: tabular-nums;
    }

    .field-desc {
      margin: 0 0 10px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--muted);
    }

    .field-controls {
      display: grid;
      grid-template-columns: 52px 1fr 52px 92px;
      gap: 10px;
      align-items: center;
    }

    .field-bound {
      font-size: 11px;
      color: var(--muted);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--brand);
    }

    input[type="number"] {
      width: 100%;
      border: 1px solid rgba(235, 207, 180, 0.95);
      border-radius: 12px;
      background: #fffefb;
      color: var(--text);
      padding: 8px 10px;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }

    .footer {
      padding: 0 24px 24px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main class="app">
    <section class="hero">
      <h1>主界面美术调参页</h1>
      <p>这里集中管理当前 Main 运行时 UI 的关键视觉参数。滑杆或数值框修改后会立即回写到主界面，并保存在当前浏览器本地缓存中，方便美术连续调效果。</p>
    </section>
    <section class="toolbar">
      <button id="refreshButton">同步当前值</button>
      <button id="referenceButton">打开参考页</button>
      <button id="resetButton" class="primary">恢复默认</button>
    </section>
    <div class="status" id="status">正在连接主界面…</div>
    <section class="grid" id="sections"></section>
    <div class="footer">
      当前仅暴露主界面最影响视觉效果的一组参数：壳层、舞台、顶栏、底栏。后续如果某个区块还需要更细颗粒度，我们可以继续往这张调参页里补。
    </div>
  </main>
  <script>
    (function () {
      var BRIDGE_KEY = "__BUDDY_CLIENT_ART_DEBUG__";
      var controlsByKey = {};
      var fieldByKey = {};
      var collapsedSections = {};

      function getBridge() {
        return window.opener && window.opener[BRIDGE_KEY];
      }

      function getSnapshot() {
        var bridge = getBridge();
        return bridge ? bridge.getSnapshot() : null;
      }

      function resolveDecimals(step) {
        var text = String(step);
        var dot = text.indexOf(".");
        return dot === -1 ? 0 : text.length - dot - 1;
      }

      function formatValue(field, value) {
        return Number(value).toFixed(resolveDecimals(field.step));
      }

      function formatBound(field, value) {
        return Number(value).toFixed(resolveDecimals(field.step));
      }

      function setStatus(text, tone) {
        var status = document.getElementById("status");
        if (!status) return;
        status.textContent = text;
        status.style.color = tone || "#9c7b63";
      }

      function isSectionCollapsed(sectionName) {
        return collapsedSections[sectionName] !== false;
      }

      function build(snapshot) {
        var container = document.getElementById("sections");
        if (!container) return;
        container.innerHTML = "";
        controlsByKey = {};
        fieldByKey = {};

        var grouped = {};
        snapshot.fields.forEach(function (field) {
          fieldByKey[field.key] = field;
          if (!grouped[field.section]) grouped[field.section] = [];
          grouped[field.section].push(field);
        });

        Object.keys(grouped).forEach(function (sectionName) {
          var sectionCollapsed = isSectionCollapsed(sectionName);
          var section = document.createElement("section");
          section.className = "section";
          if (sectionCollapsed) {
            section.classList.add("is-collapsed");
          }

          var sectionHead = document.createElement("div");
          sectionHead.className = "section-head";

          var title = document.createElement("h2");
          title.textContent = sectionName;
          sectionHead.appendChild(title);

          var toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "section-toggle";
          toggle.setAttribute("aria-label", sectionName + " 参数卷展");
          toggle.setAttribute("aria-expanded", sectionCollapsed ? "false" : "true");
          toggle.textContent = sectionCollapsed ? "∨" : "∧";
          sectionHead.appendChild(toggle);
          section.appendChild(sectionHead);

          var body = document.createElement("div");
          body.className = "section-body";
          body.hidden = sectionCollapsed;

          toggle.addEventListener("click", function () {
            var collapsed = !body.hidden;
            body.hidden = collapsed;
            collapsedSections[sectionName] = collapsed;
            section.classList.toggle("is-collapsed", collapsed);
            toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
            toggle.textContent = collapsed ? "∨" : "∧";
          });

          grouped[sectionName].forEach(function (field) {
            var row = document.createElement("div");
            row.className = "field";

            var head = document.createElement("div");
            head.className = "field-head";

            var label = document.createElement("div");
            label.className = "field-title";
            label.textContent = field.label;

            var value = document.createElement("div");
            value.className = "field-value";
            value.textContent = formatValue(field, snapshot.state[field.key]);

            head.appendChild(label);
            head.appendChild(value);
            row.appendChild(head);

            var desc = document.createElement("p");
            desc.className = "field-desc";
            desc.textContent = field.description;
            row.appendChild(desc);

            var controls = document.createElement("div");
            controls.className = "field-controls";

            var minLabel = document.createElement("div");
            minLabel.className = "field-bound";
            minLabel.textContent = formatBound(field, field.min);

            var range = document.createElement("input");
            range.id = "main-art-tuning-" + field.key + "-range";
            range.name = field.key + "_range";
            range.type = "range";
            range.min = String(field.min);
            range.max = String(field.max);
            range.step = String(field.step);
            range.value = String(snapshot.state[field.key]);

            var maxLabel = document.createElement("div");
            maxLabel.className = "field-bound";
            maxLabel.textContent = formatBound(field, field.max);

            var number = document.createElement("input");
            number.id = "main-art-tuning-" + field.key + "-number";
            number.name = field.key + "_number";
            number.type = "number";
            number.min = String(field.min);
            number.max = String(field.max);
            number.step = String(field.step);
            number.value = String(snapshot.state[field.key]);

            controls.appendChild(minLabel);
            controls.appendChild(range);
            controls.appendChild(maxLabel);
            controls.appendChild(number);
            row.appendChild(controls);
            body.appendChild(row);

            controlsByKey[field.key] = { value: value, range: range, number: number };

            range.addEventListener("input", function () {
              number.value = range.value;
              commit(field.key, range.value);
            });

            number.addEventListener("change", function () {
              range.value = number.value;
              commit(field.key, number.value);
            });
          });

          section.appendChild(body);
          container.appendChild(section);
        });
      }

      function applyState(state) {
        Object.keys(controlsByKey).forEach(function (key) {
          var controls = controlsByKey[key];
          var field = fieldByKey[key];
          if (!controls || !field) return;
          var formatted = formatValue(field, state[key]);
          controls.value.textContent = formatted;
          if (document.activeElement !== controls.range) {
            controls.range.value = String(state[key]);
          }
          if (document.activeElement !== controls.number) {
            controls.number.value = String(state[key]);
          }
        });
      }

      function commit(key, rawValue) {
        var bridge = getBridge();
        if (!bridge) {
          setStatus("主界面连接已断开，请回到游戏重新打开调参页。", "#c55b38");
          return;
        }

        var value = Number(rawValue);
        if (!Number.isFinite(value)) {
          return;
        }

        bridge.setValue(key, value);
        var snapshot = bridge.getSnapshot();
        applyState(snapshot.state);
        setStatus("已回写到主界面，可直接对照场景看效果。");
      }

      function boot() {
        var snapshot = getSnapshot();
        if (!snapshot) {
          setStatus("未连接到主界面。请从游戏里的“测试面板”重新打开。", "#c55b38");
          return;
        }

        build(snapshot);
        applyState(snapshot.state);
        setStatus("已连接主界面，当前数值与运行时同步。");
      }

      document.getElementById("refreshButton").addEventListener("click", function () {
        boot();
      });

      document.getElementById("referenceButton").addEventListener("click", function () {
        var bridge = getBridge();
        if (bridge) {
          bridge.openReferencePage();
        }
      });

      document.getElementById("resetButton").addEventListener("click", function () {
        var bridge = getBridge();
        if (!bridge) {
          return;
        }

        bridge.reset();
        boot();
      });

      window.setInterval(function () {
        var snapshot = getSnapshot();
        if (!snapshot) {
          return;
        }

        if (!Object.keys(controlsByKey).length) {
          build(snapshot);
        }
        applyState(snapshot.state);
      }, 900);

      boot();
    })();
  </script>
</body>
</html>`;

export const REFERENCE_PAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>电子宠物乐园 - 主舞台底层场景</title>
  <style>
    :root {
      --bg-primary: #FBF2E8;
      --bg-secondary: #F7E9D8;
      --brand: #F79B34;
      --gold: #F4B74F;
      --mint: #72D39A;
      --text-primary: #6E4A33;
      --border-soft: #EBCFB4;
      --border-inner: #F2DDC8;
      --shadow: 0 14px 28px rgba(187, 129, 62, 0.10), 0 6px 12px rgba(187, 129, 62, 0.07);
      --inner-shadow: inset 0 0 0 2px rgba(255,255,255,0.45);
      --radius-xl: 32px;
      --radius-lg: 24px;
      --radius-pill: 999px;
    }

    * { box-sizing: border-box; }

    html, body {
      height: 100%;
      margin: 0;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      background:
        radial-gradient(circle at top left, #fff7ef 0%, transparent 32%),
        radial-gradient(circle at bottom right, #fce6ce 0%, transparent 26%),
        linear-gradient(180deg, #FDF5EC 0%, #F8EBDD 100%);
      color: var(--text-primary);
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .AppShell {
      width: min(1280px, 100%);
      aspect-ratio: 4 / 3;
      min-height: 720px;
      background: linear-gradient(180deg, var(--bg-primary), #F9EEDF);
      border: 2px solid var(--border-soft);
      border-radius: 38px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
      padding: 18px;
    }

    .AppShell::before,
    .AppShell::after {
      content: "";
      position: absolute;
      pointer-events: none;
      border-radius: 50%;
      opacity: 0.35;
    }

    .AppShell::before {
      width: 240px;
      height: 240px;
      left: -70px;
      top: -70px;
      background: radial-gradient(circle, #FFE8C8 0%, transparent 70%);
    }

    .AppShell::after {
      width: 300px;
      height: 300px;
      right: -90px;
      bottom: -110px;
      background: radial-gradient(circle, #FFD8C4 0%, transparent 72%);
    }

    .ShellFrame {
      height: 100%;
      border-radius: 30px;
      border: 2px solid rgba(255,255,255,0.55);
      box-shadow: var(--inner-shadow);
      padding: 22px;
      position: relative;
      z-index: 1;
      display: flex;
    }

    .MainViewport {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 0;
      border-radius: var(--radius-xl);
      border: 2px solid var(--border-soft);
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45);
      background: rgba(255, 249, 241, 0.72);
      padding: 16px;
      overflow: hidden;
    }

    .MainStage {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 28px;
      border: 1.5px solid var(--border-inner);
      overflow: hidden;
      background:
        linear-gradient(180deg, #FFF8F4 0%, #FFF4E8 48%, #F8E7C9 49%, #F1DEB8 100%);
      isolation: isolate;
    }

    .MainStage::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 16%, rgba(255,255,255,0.96) 0 9%, transparent 9.5%),
        radial-gradient(circle at 26% 20%, rgba(255,255,255,0.84) 0 7%, transparent 7.5%),
        radial-gradient(circle at 72% 14%, rgba(255,255,255,0.94) 0 10%, transparent 10.5%),
        radial-gradient(circle at 82% 20%, rgba(255,255,255,0.82) 0 7%, transparent 7.5%),
        radial-gradient(circle at 10% 70%, rgba(247, 223, 162, 0.7) 0 1.8%, transparent 1.9%),
        radial-gradient(circle at 20% 76%, rgba(155, 223, 163, 0.8) 0 2.3%, transparent 2.4%),
        radial-gradient(circle at 76% 72%, rgba(243, 168, 196, 0.7) 0 1.8%, transparent 1.9%),
        radial-gradient(circle at 84% 78%, rgba(160, 221, 182, 0.8) 0 2.1%, transparent 2.2%);
      z-index: 0;
    }

    .AmbientLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
    }

    .AmbientLayer::before {
      content: "✦  ✧  ✦";
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(244, 183, 79, 0.82);
      font-size: 18px;
      letter-spacing: 10px;
      text-shadow: 0 0 12px rgba(255,255,255,0.65);
    }

    .AmbientGlow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 50% 12%, rgba(255,255,255,0.38) 0%, transparent 28%),
        radial-gradient(circle at 50% 100%, rgba(255, 214, 161, 0.22) 0%, transparent 38%);
      z-index: 1;
    }

    .StageSkeleton {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }

    .StageFloor {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 46%;
      background: linear-gradient(180deg, rgba(249,232,204,0) 0%, rgba(244,225,189,0.82) 22%, #F4E1BD 100%);
    }

    .StageBaseArc {
      position: absolute;
      left: 50%;
      bottom: 58px;
      transform: translateX(-50%);
      width: min(70%, 720px);
      height: 132px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 38%, rgba(231,197,149,0.42) 66%, rgba(209,168,111,0.18) 100%);
      filter: blur(2px);
      opacity: 0.9;
    }

    .StageGroundLine {
      position: absolute;
      left: 8%;
      right: 8%;
      bottom: 92px;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, rgba(213,171,118,0.65) 16%, rgba(213,171,118,0.65) 84%, transparent 100%);
    }

    .PetSafeZone {
      position: absolute;
      left: 50%;
      bottom: 86px;
      transform: translateX(-50%);
      width: min(42%, 420px);
      height: min(56%, 420px);
      min-width: 280px;
      min-height: 280px;
      border-radius: 28px;
      border: 2px dashed rgba(247, 155, 52, 0.34);
      background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
      z-index: 3;
    }

    .PetSafeZone::before {
      content: "PET SAFE ZONE";
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.78);
      border: 1px solid rgba(247, 155, 52, 0.18);
      color: rgba(110, 74, 51, 0.72);
      font-size: 12px;
      letter-spacing: 0.14em;
      font-weight: 700;
      white-space: nowrap;
    }

    .PetAnchor {
      position: absolute;
      left: 50%;
      bottom: 36px;
      transform: translateX(-50%);
      width: 110px;
      height: 18px;
      border-radius: var(--radius-pill);
      background: rgba(247, 155, 52, 0.18);
      border: 1px solid rgba(247, 155, 52, 0.24);
    }

    .GrassLayer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 74px;
      height: 58px;
      background:
        radial-gradient(circle at 9% 90%, #72D39A 0 13px, transparent 14px),
        radial-gradient(circle at 18% 100%, #8CDDAD 0 12px, transparent 13px),
        radial-gradient(circle at 72% 100%, #A7E6BE 0 15px, transparent 16px),
        radial-gradient(circle at 86% 92%, #6FCA95 0 14px, transparent 15px);
      opacity: 0.64;
      z-index: 2;
    }

    .StageMarker {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow:
        0 -8px 0 0 #fff,
        0 8px 0 0 #fff,
        -8px 0 0 0 #fff,
        8px 0 0 0 #fff,
        0 0 0 5px #F7B8C8 inset;
      opacity: 0.92;
      z-index: 2;
    }

    .StageMarker.left { left: 18%; bottom: 96px; }
    .StageMarker.right { right: 14%; bottom: 100px; transform: scale(0.85); }

    .StageHint {
      position: absolute;
      top: 18px;
      right: 18px;
      z-index: 4;
      padding: 10px 14px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.74);
      border: 1px solid var(--border-inner);
      color: rgba(110, 74, 51, 0.78);
      font-size: 13px;
      font-weight: 700;
      backdrop-filter: blur(4px);
    }

    .FooterTip {
      position: absolute;
      left: 26px;
      bottom: 24px;
      font-size: 12px;
      color: rgba(156, 123, 99, 0.8);
      z-index: 2;
    }

    @media (max-width: 1100px) {
      body { padding: 12px; }
      .AppShell { min-height: 660px; }
      .PetSafeZone { width: min(50%, 420px); }
    }

    @media (max-width: 920px) {
      .AppShell {
        aspect-ratio: auto;
        min-height: auto;
      }

      .ShellFrame {
        min-height: 78vh;
      }

      .PetSafeZone {
        width: min(68%, 420px);
        min-width: 240px;
        min-height: 250px;
      }

      .FooterTip {
        position: static;
        margin-top: 12px;
      }
    }

    @media (max-width: 640px) {
      .ShellFrame { padding: 14px; }
      .MainViewport { padding: 12px; }
      .StageHint {
        right: 12px;
        top: 12px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <main class="AppShell" aria-label="电子宠物乐园主舞台壳层">
    <div class="ShellFrame">
      <section class="MainViewport" aria-label="主视口 MainViewport">
        <section class="MainStage" aria-label="主舞台 MainStage">
          <div class="AmbientLayer" aria-hidden="true">
            <div class="AmbientGlow"></div>
          </div>

          <div class="StageSkeleton" aria-hidden="true">
            <div class="StageFloor"></div>
            <div class="StageBaseArc"></div>
            <div class="StageGroundLine"></div>
            <div class="GrassLayer"></div>
            <div class="StageMarker left"></div>
            <div class="StageMarker right"></div>
          </div>

          <div class="PetSafeZone" aria-label="宠物安全区">
            <div class="PetAnchor" aria-hidden="true"></div>
          </div>

          <div class="StageHint">仅保留底层画布 / 主舞台骨架</div>
        </section>
      </section>
    </div>

    <div class="FooterTip">当前版本：仅保留壳层、MainViewport、MainStage、氛围层、宠物安全区与舞台基础骨架</div>
  </main>
</body>
</html>`;
