# civ7-lf-policies-yields-preview
 Civ7 Mod to show policies Yields in the policy selection screen 

## Debugging yields with FireTuner

When the preview total doesn't match what the game actually applies, dump the recursive yield tree from a live game before/after activating the policy and diff the two trees to find which leaves changed.

1. Launch **FireTuner** from Steam → *Sid Meier's Civilization VII SDK*, then open the *Scripting Console* tab
2. In the FireTuner console, paste the snippet below to return the full yield breakdown tree for one yield (e.g. `YIELD_CULTURE`):
   ```js
   (function(){
     const p = Players.get(GameContext.localPlayerID);
     const ay = p?.Stats?.getYields?.();
     if (!ay) return null;
     for (let i = 0; i < GameInfo.Yields.length; i++) {
       if (GameInfo.Yields[i].YieldType === "YIELD_CULTURE") return JSON.stringify(ay[i]);
     }
   })()
   ```
   Or, as a **one-liner**: FireTuner's input is single-line, so copy-paste this verbatim:
   ```js
   (function(){const p=Players.get(GameContext.localPlayerID),ay=p?.Stats?.getYields?.();if(!ay)return null;for(let i=0;i<GameInfo.Yields.length;i++)if(GameInfo.Yields[i].YieldType==="YIELD_CULTURE")return JSON.stringify(ay[i]);})()
   ```
3. Select the printed JSON in the output pane and press `Ctrl+C` twice to copy it, then save it to `before.json`. Activate the policy in-game, re-run the snippet, save as `after.json`.
4. Diff the two trees to locate the leaves the policy added or changed. Each node has the shape `{ value, type, id, description?, steps?, base?, modifier? }`; non-leaf node values are derived from their children, so real changes show up as new/removed `steps` entries or as changed atomic leaves (no `steps`/`base`/`modifier`).
