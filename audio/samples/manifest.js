/* Built by tools/build_audio.py from Sound Helper's samples/manifest.js: only shipped files are listed; licence-FAIL slots have no file. */
(function(root){ var SAMPLE_MANIFEST={
 "base": "audio/samples/",
 "formats": [
  "ogg",
  "m4a"
 ],
 "slots": {
  "m16_single": {
   "batch": 1,
   "files": [],
   "blocked": "licence audit FAIL: no file, plays nothing"
  },
  "m16_burst": {
   "batch": 1,
   "files": [],
   "blocked": "licence audit FAIL: no file, plays nothing"
  },
  "m60_burst": {
   "batch": 1,
   "files": [
    "m60_burst_1",
    "m60_burst_2"
   ]
  },
  "ak47": {
   "batch": 1,
   "files": [
    "ak47_single_1",
    "ak47_single_2",
    "ak47_single_3"
   ]
  },
  "rpd_burst": {
   "batch": 1,
   "files": [],
   "blocked": "licence audit FAIL: no file, plays nothing"
  },
  "m79_launch": {
   "batch": 1,
   "files": [
    "m79_launch_1"
   ],
   "alt": [
    "m79_launch_alt_vabadus",
    "m79_launch_alt_barryshamir"
   ]
  },
  "m79_impact": {
   "batch": 1,
   "files": [],
   "blocked": "licence audit FAIL: no file, plays nothing"
  },
  "b40_launch": {
   "batch": 1,
   "files": [
    "b40_launch_1",
    "b40_launch_2"
   ],
   "alt": [
    "b40_launch_long_1",
    "b40_launch_long_2"
   ]
  },
  "whistle": {
   "batch": 1,
   "files": [
    "whistle_1"
   ],
   "alt": [
    "whistle_alt_police",
    "whistle_alt_pea_distant"
   ]
  },
  "mortar_launch": {
   "batch": 1,
   "files": [
    "mortar_launch_1",
    "mortar_launch_2",
    "mortar_launch_3"
   ]
  },
  "mortar_impact": {
   "batch": 1,
   "files": [],
   "blocked": "licence audit FAIL: no file, plays nothing"
  },
  "mortar_incoming": {
   "batch": 1,
   "files": [
    "mortar_incoming_1"
   ]
  },
  "bomb_distant": {
   "batch": 1,
   "files": [
    "bomb_distant_2",
    "bomb_distant_3",
    "bomb_distant_4",
    "bomb_distant_1"
   ]
  },
  "radio_squelch": {
   "batch": 1,
   "files": [
    "radio_squelch_1",
    "radio_squelch_2",
    "radio_squelch_3"
   ]
  },
  "huey_rotor_loop": {
   "batch": 1,
   "files": [
    "huey_rotor_loop_1"
   ],
   "alt": [
    "huey_rotor_loop_rmutt"
   ]
  },
  "smoke_canister": {
   "batch": 1,
   "files": []
  },
  "flamethrower_burst": {
   "batch": 2,
   "files": [
    "flamethrower_burst_1",
    "flamethrower_burst_2"
   ],
   "alt": [
    "flamethrower_torch_burst"
   ]
  }
 },
 "cues": {
  "b40": {
   "slot": "b40_launch",
   "helper": "b40Launch",
   "leadMs": 1000,
   "commitOnly": true,
   "attack": "rocket impact",
   "durMs": {
    "b40_launch_1": 560,
    "b40_launch_2": 660
   },
   "altDurMs": {
    "b40_launch_long_1": 2610,
    "b40_launch_long_2": 2610
   }
  },
  "chargeWarning": {
   "slot": "whistle",
   "helper": "chargeWarning",
   "leadMs": 2000,
   "commitOnly": true,
   "attack": "enemy charge",
   "durMs": {
    "whistle_1": 1120
   },
   "altDurMs": {
    "whistle_alt_police": 1050,
    "whistle_alt_pea_distant": 1700
   }
  },
  "jetFlyby": {
   "slot": "jet_flyby",
   "helper": "flyby",
   "type": "jet",
   "leadMs": 3000,
   "commitOnly": false,
   "attack": "distant bomb (bomb_distant) at bombAt",
   "durMs": {
    "jet_flyby_1": 5000
   }
  },
  "m79": {
   "slot": "m79_launch",
   "impactSlot": "m79_impact",
   "helper": "m79",
   "leadMs": null,
   "commitOnly": false,
   "note": "player weapon: launch at fire time, impact when the round lands (impactAt)",
   "durMs": {
    "m79_launch_1": 436,
    "m79_impact_1": 850
   },
   "altDurMs": {
    "m79_launch_alt_vabadus": 256,
    "m79_launch_alt_barryshamir": 502
   }
  },
  "bigNightAssault": {
   "slot": "bugle",
   "helper": "bigNightAssault",
   "enabled": false,
   "leadMs": null,
   "commitOnly": true,
   "attack": "big night assault (rare)",
   "durMs": {
    "bugle_felixblume_1": 4000
   }
  }
 },
 "thirdParty": false
};
 if(typeof module!=="undefined"&&module.exports)module.exports={SAMPLE_MANIFEST:SAMPLE_MANIFEST}; else root.SAMPLE_MANIFEST=SAMPLE_MANIFEST; })(typeof window!=="undefined"?window:this);
