# Last Chopper Out — Steam release checklist

Status of this folder: a **local, unpublished** Steam-ready scaffold (Electron + steamworks.js, placeholder App ID **480** = Valve's "Spacewar" test app). Nothing here has been uploaded anywhere.

## 0. What is already done in this repo
- Settings menu (music / SFX sliders, screen-shake + gore toggles, fullscreen), pause menu, gamepad support (stick/D-pad move, A confirm, B back, Start pause), settings persisted.
- Electron wrapper (`main.js`, `preload.js`), fullscreen/windowed (F11 / Alt+Enter / settings button), placeholder icon (`build/icon.png`, `build/icon.ico`).
- Steamworks scaffold (`steam.js`): 27 achievements (from `ACH` in `index.html`), graceful no-op fallback when Steam isn't running, optional Steam Cloud write/read of `save.json`.
- Single JSON save file `save.json` in Electron `userData` (atomic write, `savedAt` timestamp) — Auto-Cloud friendly.
- electron-builder config for Windows x64 (NSIS installer + zip) and Linux (dir).

## 1. Things YOU must do (I can't / shouldn't do these)
### Accounts & money
- [ ] Create a **Steamworks partner account** (partner.steamgames.com) and sign the Steam Distribution Agreement.
- [ ] Pay the **$100 Steam Direct app fee** per game (recoupable after $1,000 adjusted gross revenue).
- [ ] Complete **identity verification, tax interview (W-9 / W-8BEN) and bank/payment info**. Allow days to weeks for verification.
- [ ] Decide legal entity / publisher name; replace `author`, `copyright` and `appId` (`com.example.vietnamsurvivors`) in `package.json`.

### Steamworks configuration
- [ ] Create the app → get the real **App ID**. Replace `480` in: `main.js` (`STEAM_APP_ID`), `steam_appid.txt`. (Do NOT ship `steam_appid.txt` in the final depot if you launch via Steam; it is only for dev launches.)
- [ ] Create the **achievements** in Steamworks (App Admin → Stats & Achievements) with these exact API names (the game calls `steamworks.achievement.activate(id)` with the lowercase `ACH` ids; checked 2026-10-20), plus 256×256 unlocked + greyed icons:
  `boots, hold_5, hold_10, hold_15, first_out, all_home, ten_home, full_home, fallen_home, early_call, mid_call, late_call, later_call, waveoff, waveoff2, moh_one, moh_two, barrage5, barrage10, sapper_stop, night_hold, firebase, kills_250, kills_1000, lvl_10, lvl_20, ACH_HUEY_UNLOCK` (27; display names/descriptions are in `ACH` in `index.html`). The other old `ACH_*` names are obsolete. `ACH_HUEY_UNLOCK` is kept (Vet, rc7.1): display "Guns Up", description "Huey gunship escort unlocked."
  - [ ] Wiring gap: `preload.js` exposes `window.vsHost` (old `ACH_*` regex in `main.js`), but the game looks for `window.steamworks`/`window.greenworks`. Bridge one to the other before shipping, or unlocks will not reach Steam.
  Publish the stats/achievements config.
- [ ] **Steam Cloud**: enable it and add an Auto-Cloud rule: root `WinAppDataRoaming` (Electron's userData = `%APPDATA%/Last Chopper Out`), subdirectory `Last Chopper Out`, pattern `save.json`, OS Windows (+Linux/Mac if shipped). Set byte/file quota (≥ 1 file, ~64 KB is plenty). The in-app `steam.cloud` API path is a fallback; use one or the other deliberately and test sync across two machines.
- [ ] Set up **depots/builds** with SteamPipe (`steamcmd`, `app_build.vdf`). Upload `dist/win-unpacked` contents as the Windows depot; launch option executable `Last Chopper Out.exe`. (steamworks.js native libs are already unpacked via `asarUnpack`.)
- [ ] Set **supported controllers / Steam Input** (currently Gamepad API — works for Xbox/XInput and Steam Input "gamepad" templates; consider a Steam Input config + verify Steam Deck, Deck Verified needs readable text/default controller config/launcher without anti-cheat popups).
- [ ] Code-sign the .exe/installer (optional but strongly advised; not done here — `signAndEditExecutable:false` because the Windows build ran on Linux without Wine; icon/version resources therefore aren't embedded in the .exe — re-run `npm run dist:win` on a Windows machine (or with Wine installed) with that flag removed for a branded .exe).
- [ ] Test on real Windows 10/11 with the Steam client running: overlay (Shift+Tab), achievements popup, Cloud sync, Steam Deck.

### Store page and timing (checked against Steamworks docs, 2026-10-20)
- Valve still states a **30-day waiting period** between paying the app fee and release (partner.steamgames.com/steamdirect). No 21-day figure was found in the current docs, so 30 stays.
- A public **Coming Soon** page must be live **at least 2 weeks** before release; submit the store page for review **at least 7 business days** before you want it live (review is typically 3–5 business days). The release date cannot be changed inside the last 14 days.
- [ ] Short description (≤300 chars), long description, tags, genre, languages, system requirements.
- [ ] **Capsule/graphic assets** (Steamworks "Graphical Assets"):
  - Header capsule **920×430**
  - Small capsule **462×174** (120×45 and 184×69 are generated from it)
  - Main capsule **1232×706**
  - Vertical capsule **748×896**
  - Bundle header (bundles only) 707×232
  (sizes from partner.steamgames.com/doc/store/assets/standard, checked 2026-10-20; library sizes below not re-checked)
  - Page background (optional) 1438×810
  - Library capsule **600×900**, Library header **920×430**, Library hero **3840×1240**, Library logo (PNG with transparency, up to 1280×720)
  - Community icon 184×184, client icon 16×16/32×32 (.ico/.jpg per Steam requirements)
  - **Screenshots** ≥ 5 at **1920×1080** (no UI mock-ups; must show actual gameplay)
- [ ] **Trailer** (1080p+ MP4/H.264, ideally 30–60 s, gameplay first; no fake review quotes). Must show real gameplay.
- [ ] **Content Survey** in Steamworks (violence, blood/gore, real-world conflict, sensitive topics, AI-generated content disclosure: answer it from the asset logs (`ASSET_LICENSE_LOG.md`, `audio/THIRD_PARTY_AUDIO.txt`, `audio/samples/LICENSES.md`) and disclose anything AI-assisted).
- [ ] **Age ratings**: complete the Steamworks **IARC** questionnaire (ESRB/PEGI/USK/etc. auto-issued). Expect **Mature/PEGI 16–18-ish** depending on gore setting; consider shipping with Gore default ON but offering the toggle (already exists) and describe it honestly on the store page. Some regions (e.g. Germany USK, Australia, China) have additional rules around depictions of war.
- [ ] Mature-content / "Adult only" check: Steam also has "Mature Content Description" text field for violence.
- [ ] Privacy policy / support URL / developer & publisher contacts; **EULA** if desired.
- [ ] Pricing, regional pricing, release date, Steam build review (typically 1–5 business days; resubmit if rejected).
- [ ] Optional: Trading cards/badges, Steam Workshop (not needed), leaderboards (not implemented), Rich Presence.
- [ ] Check Steam's **AI disclosure** page and **content rules** for depictions of real wars/groups (see risks below).

## 2. How to build / run (reference)
```
cd steam   # copy of /workspace/vietnam-steam scaffold files; game/ = this repo's build
npm install
npm start                      # needs a display
npm run test:smoke             # xvfb smoke test (exit 0 = pass)
npm run dist:win               # dist/*.zip + dist/win-unpacked (works on Linux)
npm run dist:win:installer     # NSIS installer: needs Windows (or Wine)
npm run dist:linux             # dist/linux-unpacked
```
Dev tip: run the Steam client (logged in), keep `steam_appid.txt` (480) next to the executable, launch the app; achievements will then be real on Spacewar. Without Steam the game logs `[steam] unavailable: ...` and plays normally; achievements are still stored in `save.json` and re-synced to Steam on the next launch where Steam is available.

## 3. Asset / content risks to review and replace before shipping
These are things a platform reviewer, a rating board, or the Vietnamese/US/other communities could object to. None is a guarantee of rejection — but decide each one deliberately.
1. **Real conflict + real factions.** The game depicts the Vietnam War (US vs. Viet Cong/NVA) with player-as-US-soldier killing waves of enemies in an arcade, humorous, "horde" tone. Valve allows historical war games, but treatment matters: avoid framing that celebrates atrocities or glorifies killing of an ethnic group. Consider an alternative fictionalised setting/faction names ("Jungle Front", generic "insurgents") to lower risk — also cheaper for ratings and some regions (Vietnam itself, China, Germany for symbols).
2. **Enemy depiction / stereotypes.** Check VC sprites (conical hats, black pyjamas) and speech bubbles for caricature. Replace stereotyped visuals/voice-lines with neutral designs. I declined the request to alter text into accent-mocking spelling ("Hory mory"); keep it that way — no phonetic mockery of accents.
3. **Phrases to review/replace:** VC speech bubbles incl. **"Long live Ho Chi Minh!"** (political slogan of a real leader), **"Diddy mao!"** (also reads as a slang/pun risk), other Vietnamese phrases (check spelling/diacritics with a native speaker; incorrect or demeaning usage is a risk), "Holy moly!". Prefer neutral shouts or remove real political figure names entirely.
4. **Agent Orange / Ranch Hand / napalm-style flame tank (M67) / Arc Light.** Real chemical-warfare and civilian-harm history; shown here as orange DoT clouds with arcade liberty (B-52 dropping defoliant is historically inaccurate). Consider renaming to generic ("Defoliant spray", "Bomber run") and removing the real-event labeling; avoid anything suggesting civilian victims.
5. **Gore.** Blood decals, gibs, drops. Keep the toggle; make sure the default and the store-page content descriptors match ratings answers; verify no minors depicted (none are).
6. **Real-unit / trademarked / real-equipment names:** A-1H Skyraider, A-4E, F-4B Phantom, B-52D, UC-123, M48A3 Patton, M67, M551 Sheridan, UH-1 Huey, PBR, M60, M79, M2, AK-47, etc. Historical designations are generally fine, but manufacturers' trademarks (e.g., Bell "Huey" art, lighter brand names) can be a risk; rename or generalise (rc8: the lighter brand name is fully removed). Do not use official unit insignia/patches or real campaign/operation names/logos.
7. **Music & SFX.** Music and SFX are recorded/licensed tracks and samples listed in `audio/THIRD_PARTY_AUDIO.txt` and `audio/samples/LICENSES.md`, plus synthesised cues. Check every license allows commercial Steam distribution and credit them in-game (`audio/INGAME_CREDITS_BLOCK.txt`).
8. **Art.** Pixel art, sprites and archive photos are logged in `ASSET_LICENSE_LOG.md` (archive photos: check each entry in `assets/photos/photos.json`). Steam requires you hold rights to every asset; capsule/screenshot assets need a professional pass. The placeholder icon (`build/icon.*`) must be replaced.
9. **Third-party licenses:** Electron (MIT), steamworks.js (MIT), Chromium notices — ship `LICENSES.chromium.html` (included in the Electron build) and list in credits. Spacewar (App ID 480) must NOT be shown on your store page or shipped under that ID.
10. **Disclosure:** Steam's store page must truthfully describe contents (violence, real-world war setting), and any AI-assisted content must be disclosed in the Content Survey.
11. **Regional bans:** depictions of certain flags/symbols and war themes can affect availability (China, Germany USK symbols, Vietnam). Check Steam's per-region blocking and keep flags/emblems fictional.
12. **Tone.** The game is arcade-comical; combined with real war, atrocities and death of real people. Keep marketing sober and avoid jokes about Agent Orange victims, My Lai etc. Add a short "this is a fictionalised arcade depiction" line to the store page / credits if you keep the setting.

## Regenerated 2026-10-03 (big content update)
- Menu: Start -> character select -> Deploy; gamepad START opens select / deploys, B backs out, A/B/START skips intro + briefing (briefing plays once, stored in localStorage).
- In play: X/Y = character ability; level-up: X = reroll, Y = banish.
- Music/SFX settings now drive the in-game Music/SFX buses (Snd.setVol); character progression (now `lco_chars`/`lco_char`; old `lbo2_*` keys are copied on first load) is mirrored into save.json.
- Smoke test: opens character select, deploys, skips intro; exit 0, ~60 fps.

## Rename to Last Chopper Out (2026-10-20, feature/next)
- `package.json`: name `last-chopper-out`, description and productName Last Chopper Out, appId `com.example.lastchopperout` (still a placeholder).
- `main.js`: userData pinned to `<appData>/Last Chopper Out`; on first launch copies `save.json` and `Local Storage` from `Last Bird Out` / `vietnam-survivors` / `last-bird-out` (old folder kept). Marker `.lco_migrated`.
- Game: localStorage `lbo2_*`/`lbo2demo_*` → `lco_*`/`lcodemo_*`, copied once on first load (old keys kept). Test: `tools/migtest.js`.
