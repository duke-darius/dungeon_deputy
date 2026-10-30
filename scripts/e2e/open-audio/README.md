# Kenney RPG Audio — E2E fixtures

These three short Ogg Vorbis effects are used only by the Electron integration test to exercise import, decode, playback, and persistence with real open-source media. They are not auto-installed or auto-played by Dungeon Deputy.

- Source pack: [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio)
- Creator: Kenney Vleugels ([Kenney.nl](https://kenney.nl/))
- License: [Creative Commons Zero 1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/)
- The pack's original `License.txt` is included in this directory. Kenney says attribution is appreciated but not required; it is retained here for clear provenance.

Included source files and SHA-256:

| File | Pack path | SHA-256 |
|---|---|---|
| `bookOpen.ogg` | `Audio/bookOpen.ogg` | `953390534377222BEE89AC8CD9E60A58FDC037C71A4D7C18C43CD647C7F34BA8` |
| `doorOpen_1.ogg` | `Audio/doorOpen_1.ogg` | `4AB93BAB96522D8EB109FF96DC57CB6765DEB02448FE14C10472084BE5BB2A0B` |
| `handleCoins.ogg` | `Audio/handleCoins.ogg` | `8A91F969E932DF709DF80EE124D86A51389EED9B67F22E5E716BC2BBF60D8DAB` |

The E2E additionally keeps a generated WAV for deterministic policy tests and the invalid-WAV import fixture. Runtime codec support is only claimed for formats that the tested packaged runtime successfully decodes.
