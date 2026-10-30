# Built-in soundboard defaults

These three compact PCM WAV files are optional first-run soundboard assignments. They are derived from the corresponding short Ogg Vorbis assets in Kenney's RPG Audio pack. Source import fixtures and their original license are retained unchanged in `scripts/e2e/open-audio/`.

- Creator/source: Kenney Vleugels, [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio)
- License: [Creative Commons Zero 1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/); the source pack's original `License.txt` is retained beside this README.
- Conversion: Ogg Vorbis decoded and exported as uncompressed PCM WAV, mono, signed 16-bit little-endian, 22.05 kHz. No runtime conversion or network access is required.

| Shipped default | Source filename | Shipped WAV SHA-256 | Source Ogg SHA-256 |
|---|---|---|---|
| Book open | `bookOpen.ogg` | `6254CBE36FBBEED7A23273634B5EC16FA0C31B0DF112ADCCA477AE896CE7B4EF` | `953390534377222BEE89AC8CD9E60A58FDC037C71A4D7C18C43CD647C7F34BA8` |
| Door opens | `doorOpen_1.ogg` | `A8546AC2AA488EE411C2641E5F860689133BBCDF91E8FB018C6AAEAC1A4329F2` | `4AB93BAB96522D8EB109FF96DC57CB6765DEB02448FE14C10472084BE5BB2A0B` |
| Coins handled | `handleCoins.ogg` | `9EF4D312AB28D3E305B854635DB0E0B4126C795A056CB95DC5C36CA1C5ABDBFE` | `8A91F969E932DF709DF80EE124D86A51389EED9B67F22E5E716BC2BBF60D8DAB` |

The installed app copies these fixed resources into app-owned user storage only for a new or legacy pristine soundboard. They are ordinary editable assignments on Pads 1–3, never auto-play, and a durable separate marker prevents reinstall after a user clears them. Pads 4–12 stay empty. The original Ogg fixtures remain separate and are used only to exercise user-driven import.
