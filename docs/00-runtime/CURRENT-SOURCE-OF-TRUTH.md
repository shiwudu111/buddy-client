# CURRENT-SOURCE-OF-TRUTH.md

> 鐩殑锛氱粰 Codex / Agent / Reviewer 涓€涓€滃綋鍓嶅敮涓€鎵ц鐪熺浉鈥?> 瑙勫垯锛氭湰鏂囦欢鍙啓鐜板湪鏈夋晥鐨勬墽琛屽彛寰勶紝涓嶅啓鍘嗗彶璁ㄨ
> 鑻ヤ笌鍘嗗彶鏂囨。鍐茬獊锛屼互鏈枃浠?+ 褰撳墠鍐荤粨楠屾敹鍙ｅ緞涓哄噯

---

## 0. Meta

- Repo: `buddy-client`
- Phase: `瀛︾敓绔富鐣岄潰鏀圭増 + 鍙ｇ伯璧勬簮绯荤粺鑱旇皟鍑嗗 / 鍓嶇钀藉湴鎺ㄨ繘`
- Updated At: `2026-04-21`
- Owner: `current-collab`
- Effective Until: `琚笅涓€鐗?CURRENT-SOURCE-OF-TRUTH 鏇夸唬鍓嶆寔缁湁鏁坄

---

## 1. Current Project Goal

褰撳墠鐩爣涓嶆槸缁х画鎵╂柊妯″潡锛岃€屾槸锛?- 淇濇寔 MVP 涓婚摼璺ǔ瀹氬彲楠屾敹
- 鏄庣‘褰撳墠宸插畬鎴愬姛鑳界殑姝ｅ紡鎵ц鍙ｅ緞
- 鍦ㄤ笉鐮村潖涓婚摼璺殑鍓嶆彁涓嬫帹杩涘鐢熺涓荤晫闈㈡敼鐗堜笌璧勬簮绯荤粺鑱旇皟锛屼互鍙婁富椤靛墠绔３瀛愯惤鍦?
褰撳墠鍞竴鎬荤洰鏍囷細

**鍦ㄤ笉鎵╁ぇ鑼冨洿鐨勫墠鎻愪笅锛岀淮鎸佸鐢熺 / 瀹堕暱绔富閾捐矾绋冲畾锛屽苟鎶?`Pet 鎴愰暱/杩涘寲 v1` 鍋氬埌鍔熻兘鍙獙鏀躲€?*

---

## 2. In Scope Now

褰撳墠鍏佽鎺ㄨ繘鐨勫唴瀹瑰彧鏈夛細

1. 瀛︾敓绔富鐣岄潰鏀圭増
   - 涓婚〉澹冲瓙閲嶅仛
   - 瀹犵墿鍦烘櫙鍖洪噸鍋?   - 鍙充晶鏃ュ織鍖?   - 搴曢儴涓绘搷浣滃尯

2. 鍙ｇ伯璧勬簮绯荤粺鑱旇皟鍑嗗
   - `energy / health` 瀛楁鍙ｅ緞
   - 鍙ｇ伯搴撳瓨鍙ｅ緞
   - 浣滀笟濂栧姳鍙ｇ伯鍙ｅ緞
   - 閫夌伯鍠傚吇鍙ｅ緞

3. `Pet 鎴愰暱/杩涘寲 v1`
   - 瀛︾敓绔垚闀块〉灞曠ず
   - 褰撳墠鐘舵€佸睍绀?   - 杩涘寲鏉′欢灞曠ず
   - 鏈€杩戞垚闀垮弽棣堝睍绀?   - 涓?`鍠傚吇鎴愬姛`銆乣浣滀笟鎻愪氦鎴愬姛` 涓や釜瑙︾偣鐨勫眬閮ㄨ仈鍔?
4. 涓婚摼璺洖褰?   - `Login`
   - `Main`
   - `Parent`
   - `Homework`
   - `First-pet`

5. 鍗忎綔鏂囨。鍚屾
   - 褰撳墠鐘舵€佹枃妗?   - 褰撳墠鎵ц鐪熺浉鏂囨。
   - Main 棣栭〉 P0 缁撴瀯鏁存敼鎵ц鍗曪紙褰撳墠鐗堬級
   - 褰撳墠楠屾敹娓呭崟

---

## 3. Explicitly Out of Scope Now

鏈樁娈垫槑纭笉鍋氾細
- 鑱婂ぉ缁х画鎵╁姛鑳?- 鑱婂ぉ褰卞搷鎴愰暱
- 瀹堕暱绔垚闀块〉鎴栨垚闀胯仈鍔?- 鏂扮殑瀵艰埅銆乼ab銆佺嫭绔嬪満鏅?- 姝ｅ紡閫夎泲 / 瀛靛寲绯荤粺
- 绋€鏈夊害 / 鐗╃缁撴灉鎵胯
- 澶嶆潅瀹犵墿婕斿嚭
- 鏂扮殑鍚庣 mock / 鍋囨帴鍙?/ 浼瓧娈?- 鑷姩鍖栨祴璇曚綋绯讳笓椤?- UI 鏈€缁堣瑙夊畾鐗堜紭鍖?- 鍦?`energy / health / foods` 濂戠害鏈喕缁撴椂鎻愬墠瀹炵幇涓荤晫闈㈣祫婧愮郴缁?
---

## 4. Mainline Priority

鎵€鏈夊伐浣滀紭鍏堜繚璇佽繖鏉′富閾捐矾涓嶈鐮村潖锛?
`鐧诲綍 -> 鍒涘缓瀹犵墿 -> 鎻愪氦浣滀笟 -> 瀹犵墿鐘舵€佸彉鍖?-> 瀹堕暱鏌ョ湅缁撴灉`

濡傛灉鏂版敼鍔ㄥ奖鍝嶄富閾捐矾绋冲畾锛屽簲浼樺厛鍥為€€鎴栧仠姝紝鑰屼笉鏄户缁彔鍔犲姛鑳姐€?
---

## 5. Current Operational Truths

### 5.1 Login Truth

褰撳墠鐧诲綍鍏ュ彛鎵ц鍙ｅ緞锛?
`restore -> brandEntry -> roleSelect -> authForm(role, mode)`

鍥哄畾瑙勫垯锛?- `roleSelect -> authForm` 榛樿杩涘叆 `mode=login`
- 鐧诲綍鎴愬姛鍚庣殑鐪熷疄韬唤浠ュ悗绔繑鍥?`user.role` 涓哄噯
- `restore` 鏃犱細璇濇垨鎭㈠澶辫触鏃剁粺涓€鍥炲埌 `brandEntry`
- 涓嶆媶澶氫釜 Cocos Scene

### 5.2 Parent Binding Truth

褰撳墠姝ｅ紡鑱旇皟鍙ｅ緞锛?
- `1 涓闀?<-> 1 涓瀛恅
- 鍙屽闀跨粦瀹氬悓涓€涓瀛愪笉鏄綋鍓嶅凡鏀寔鑳藉姏
- 鐘舵€佺爜璇箟锛?  - `404`锛氬瀛愪笉瀛樺湪
  - `409`锛氬瀛愬凡琚叾浠栧闀跨粦瀹氾紝鎴栧綋鍓嶅闀垮凡缁戝畾鍏朵粬瀛╁瓙
  - `403`锛氬綋鍓嶇櫥褰曠敤鎴蜂笉鏄闀?
### 5.3 First Pet Truth

褰撳墠 MVP 瀵归娆″疇鐗╁垱寤虹殑姝ｅ紡涓氬姟缁撴灉鍙湁锛?
`鏃犲疇鐗╁鐢熼娆¤繘鍏?-> 鍒涘缓瀹犵墿 -> 杩涘叆涓婚摼璺痐

褰撳墠涓嶆壙璇猴細
- 铔嬬被鍨?- 绋€鏈夊害
- 鐗╃
- hatchSeed
- 瀛靛寲缁撴灉鍙鐜?
浠讳綍宸叉湁鈥滈€夎泲 / 瀛靛寲鈥濇紨鍑猴紝涓€寰嬭涓哄師鍨嬫垨鍏抽棴鑳藉姏锛屼笉杩涘叆姝ｅ紡楠屾敹銆?
### 5.4 Chat Truth

瀛︾敓绔亰澶?v1 宸插畬鎴愬苟鏀跺彛銆?
褰撳墠姝ｅ紡鍙ｅ緞锛?- 鑱婂ぉ鍏ュ彛鍦?`Main` 瀛︾敓绔富鐣岄潰鍐?- 鑱婂ぉ鍙湪褰撳墠杩愯浼氳瘽鍐呬繚鐣?- 閫€鍑虹櫥褰曞悗娓呯┖
- 鍏抽棴娴忚鍣ㄥ悗閲嶆柊鍚姩涓嶈嚜鍔ㄥ洖鐏屾棫鑱婂ぉ
- 鑱婂ぉ涓嶄細褰卞搷瀹犵墿鎴愰暱
- `chat/history` 鎺ュ彛褰撳墠涓嶄綔涓哄惎鍔ㄨ嚜鍔ㄦ仮澶嶄富娴佺▼

### 5.5 Pet Growth Truth

`Pet 鎴愰暱/杩涘寲 v1` 褰撳墠姝ｅ紡鍙ｅ緞锛?- 鍙仛瀛︾敓绔?- 鍙仛鎴愰暱椤靛睍绀轰笌灞€閮ㄨ仈鍔?- 鍙帴涓や釜鎴愬姛瑙︾偣锛?  - `鍠傚吇鎴愬姛`
  - `浣滀笟鎻愪氦鎴愬姛`
- 鏈€杩戞垚闀垮弽棣堝彧鎻忚堪鏈€杩戜竴娆＄粨鏋?- 涓嶆壂鎻忓巻鍙蹭綔涓?- 涓嶅洖鏀惧巻鍙蹭簨浠?- 涓嶄吉閫犳垚闀垮閲忔暟鍊?- 褰撳墠鎴愰暱椤靛姛鑳藉彲楠屾敹锛屼絾鐣岄潰瑙傛劅涓嶄綔涓烘湰闃舵鏈€缁堣瑙夊畾鐗堟爣鍑?
### 5.6 Main Interface Truth
- 瀛︾敓绔富鐣岄潰鏀圭増浠?`index.html` 浣滀负褰撳墠瑙嗚鍙傝€?- 涓婚〉闇€瑕佺湡瀹炲彛绮祫婧愮郴缁熸敮鎾戯紝涓嶆帴鍙楀墠绔吉搴撳瓨
- `energy / health` 浣滀负涓嬩竴闃舵閲嶈鐘舵€佸瓧娈碉紝闇€瑕佷笌鍚庣鍐荤粨鍙ｅ緞瀵归綈
- 涓荤晫闈㈣仈璋冨簲浼樺厛浣跨敤鏈鏂板鐨?`Main 棣栭〉 P0 缁撴瀯鏁存敼鎵ц鍗曪紙褰撳墠鐗堬級`
- 涓婚〉褰撳墠鎵ц鍙ｅ緞鏄?`app-shell + frame + top/main/bottom + left/center/right`锛屼笉鍐嶆妸鏁撮〉缂╂斁寮?SafeFrame 褰撴垚棣栭〉鑸炲彴鍩哄噯
- 涓婚〉绗竴鐗堝凡鎺ュ叆鐘舵€佸崱銆佸疇鐗╁満鏅€佹渶杩戜簨浠躲€佸簱瀛樻槑缁嗕笌閫夌伯鍠傚吇寮瑰眰锛屽悗缁彧鍦ㄥ悓涓€鏉′富椤甸摼璺笂鏀跺彛浼樺寲
- 瀹犵墿鍦烘櫙瀹瑰櫒宸叉敼鎴愮湡姝ｇ殑 `scene` 鐖惰妭鐐癸紝瀹犵墿涓讳綋銆佹皵娉°€佸悕瀛楃墝鍜屽簳鏉块兘鎸傚叆 scene
- 褰撳墠瀛︾敓绔椤靛凡缁忔敹鍙ｅ埌鍙傝€冮〉鐨勫悓绫婚鏋讹紝涓嶅啀鏄棫鐗堟暣椤电缉鏀惧３瀛愶紱鍚庣画鍙厑璁稿仛鍚岄摼璺唴鐨勭粏鑺傛敹鍙?- 褰撳墠涓婚〉瑙嗚鍙兘瑙嗕负鈥滅涓€鐗堝姛鑳藉３瀛?+ 鍒濇鏆栬壊鍦烘櫙鈥濓紝涓嶈兘瑙嗕负鈥滄帴杩戝弬鑰冪瀹屾垚鎬佲€?- 褰撳墠瑙嗚宸紓宸插崟鐙矇娣€涓恒€奙ain 棣栭〉 P0 缁撴瀯鏁存敼鎵ц鍗曪紙褰撳墠鐗堬級銆嬶紝鍚庣画鎸?P0 / P1 / P2 鎵ц锛屼笉鍐嶉潬闆舵暎寰皟鍗曚釜鍏冪礌鎺ㄨ繘

---

## 6. Current Acceptance Floor

鏈樁娈垫渶浣庡畬鎴愭爣鍑嗭細

1. 瀛︾敓绔亰澶?v1 鍔熻兘閫氳繃
2. Homework 涓婚摼璺€氳繃
3. 瀹堕暱绔渶灏忎富閾捐矾閫氳繃
4. `Pet 鎴愰暱/杩涘寲 v1` 鍔熻兘鍙獙鏀?5. 瀛︾敓绔富鐣岄潰 P0 缁撴瀯鏁存敼鎵ц鍗曞凡寤虹珛
6. 褰撳墠鐘舵€佹枃妗ｄ笌鎵ц鍙ｅ緞鏂囨。宸插悓姝?
---

## 7. Risk Rules

浠ヤ笅鏀瑰姩榛樿楂橀闄╋紝蹇呴』鍏堝仠骞惰褰曢樆濉烇細
- 闇€瑕佷慨鏀瑰悗绔崗璁墠鑳藉畬鎴愬綋鍓嶆垚闀块〉鏍稿績灞曠ず
- 闇€瑕佹妸鑱婂ぉ绾冲叆鎴愰暱鑱斿姩
- 闇€瑕侀噸鏋?homework 涓讳氦娴佺▼
- 闇€瑕佹柊澧炶法妯″潡 shared 绫诲瀷鎴栧叏灞€鐘舵€佺鐞?- 闇€瑕佹敼鍔ㄥ鐢熺涓诲鑸粨鏋?- 闇€瑕佹妸褰撳墠鍔熻兘鐗堥〉闈㈢洿鎺ュ綋鎴愭渶缁堣瑙夌増浜や粯
- 闇€瑕佸湪 `energy / health / foods` 濂戠害鏈喕缁撴椂鎻愬墠瀹炵幇涓荤晫闈㈣祫婧愮郴缁?
---

## 8. Allowed Decision Pattern

Codex / Agent 閬囧埌涓嶆槑纭椂锛屾寜涓嬮潰椤哄簭鍐崇瓥锛?1. 鍏堢湅鏈枃浠?2. 鍐嶇湅褰撳墠浠诲姟鍖呮垨 `PLAN.md`
3. 鍐嶇湅褰撳墠楠屾敹娓呭崟
4. 浠嶄笉鏄庣‘鏃讹細
   - 涓嶈剳琛ラ渶姹?   - 涓嶆墿鑼冨洿
   - 鍦ㄤ氦浠樹腑鏍囨敞 `Needs Owner Decision`

---

## 9. Forbidden Behaviors

绂佹锛?- 鎶婂巻鍙茶璁哄綋褰撳墠鏍囧噯
- 椤烘墜鎵╄瑙夈€佹墿浜や簰銆佹墿妯″潡
- 鐢ㄥ墠绔紨鍑哄弽鎺ㄦ寮忎笟鍔?- 鍦ㄦ湭鍐荤粨濂戠害涓婅嚜琛屾柊澧炲瓧娈?- 鍥犱负鈥滄洿鍚堢悊鈥濊€岃法妯″潡鏀瑰姩
- 榛樿鎶婂綋鍓嶆垚闀块〉鍔熻兘鐗堝綋鏈€缁堣瑙夌増

---

## 10. Active Test Data Requirement

鎵€鏈夎仈璋?/ 鍥炲綊浼樺厛浣跨敤鍥哄畾娴嬭瘯鏁版嵁锛?- 瀛︾敓绔甯哥櫥褰曡处鍙?- 瀛︾敓绔凡鏈夊疇鐗╄处鍙?- 瀛︾敓绔棤瀹犵墿璐﹀彿
- 瀹堕暱绔湭缁戝畾璐﹀彿
- 瀹堕暱绔凡缁戝畾璐﹀彿
- 缁戝畾鍐茬獊楠岃瘉璐﹀彿

---

## 11. Change Protocol

浠ヤ笅鎯呭喌蹇呴』鍏堟洿鏂版湰鏂囦欢锛屽啀缁х画鎵ц锛?- 鑱婂ぉ鏄惁鎭㈠鑷姩鍘嗗彶
- 鑱婂ぉ鏄惁褰卞搷鎴愰暱
- 鎴愰暱椤垫槸鍚﹁繘鍏ユ渶缁堣瑙変紭鍖栭樁娈?- Parent 鍙ｅ緞鍙樺寲
- Sprint 閲嶇偣鍙樺寲
- 楠屾敹鏍囧噯鍙樺寲
- 涓荤晫闈㈡敼鐗堝绾﹀喕缁撴儏鍐靛彉鍖?
---

## 12. Current Owner Notes

鏈疆鎵ц鍘熷垯锛?- 浠ユ敹鍙ｅ拰楠屾敹涓虹洰鏍囷紝涓嶄互鈥滄洿婕備寒鈥濇垨鈥滄洿瀹屾暣鈥濅负鐩爣
- 鍔熻兘鍙獙鏀朵笉绛変簬瑙嗚鏈€缁堝畾鐗?- 褰撳墠鎴愰暱椤佃鎰熼棶棰樺簲鍗曠嫭寮€ UI 浼樺寲浠诲姟澶勭悊锛屼笉娣峰叆褰撳墠鍔熻兘浠诲姟

## 2026-04-20 Truth Update
- The active execution path now includes responsive layout metrics, theme tokens, upgraded runtime UI primitives, and an app-shell/frame-based Main render root.
- The child top bar has been upgraded into a responsive combined shell with pill tabs and compact-mode controls.
- Compact child overview now suppresses the always-on right event panel instead of keeping the old fixed three-column feel.
- Main child overview panels and action bar now derive sizes and placement from layout metrics instead of pure fixed coordinates.
- Main child scene panel and compact event panel now derive title, card, and summary spacing from layout metrics.
- PetGrowthView is aligned with the same warm responsive card system as the main shell.
- The legacy child branch inside MainController's renderGlobalActions is gone; only the parent header action shell remains there.
- The main overview scene bubble, name tag, and right-side summary cards now use the shared product component set instead of bare boxes.
- The main overview scene backdrop layers and the pet hero proportions were tightened again to better match the reference composition.

## 2026-04-21 Truth Update
- Main now uses a layered responsive layout strategy instead of a single fixed board.
- The rendering layers are separated into backdrop, shell, safe area, and interaction entry.
- The shell aspect is chosen from viewport breakpoints and interpolates between them, so tablet and phone screens can share the same screen logic.
- The internal reference entry button is positioned inside the safe area, which keeps the layout extensible for future content without hardcoding the screen size.
- Future Main collaboration must keep using `viewport + breakpoint + safe area` and should not reintroduce a fixed 4:3 or fixed 16:9 board as the only layout model.
