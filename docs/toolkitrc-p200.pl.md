# ToolkitRC P200: sprawdzony prototyp sterowania z przeglądarki

[English](toolkitrc-p200.md) · [Projekt na CopperTrace](https://coppertrace.co.uk/pl/projects/toolkitrc-p200/)

Aktualizacja publicznego opisu: **14 października 2026**. Szczegółowe próby integracji: **10 października 2026**.

## Osiągnięcie

Zmodyfikowany **ToolkitRC P200 V1 / V1.05-STN**, z zaobserwowanym MCU GD32F103CBT6, jest sterowany z **Labrax Bench Control** przez jeden mostek Pico podłączony do USB. Sprawdzony układ obsługuje:

- Nastawy głównego napięcia i limitu prądu.
- Główne OUTPUT ON/OFF z określeniem docelowego stanu, a nie przełączaniem toggle.
- APPLY zachowujące poprzedni stan wyjścia.
- Pomiary głównego napięcia, prądu ze znakiem i mocy.
- Opcjonalny Live z odczytem co około sekundę.
- Identyfikację kontrolera USB-C oraz pomiary napięcia i prądu USB.
- USB OFF i powrót do fabrycznej negocjacji AUTO.
- Osobne źródło wejściowe 12 V / 5 A; Riden pozostaje niezależnym kanałem stanowiska.

## Architektura

```text
Przeglądarka → lokalna usługa Labrax → mostek USB na Pico
                                            ↓
                                  własne łącze GPIO clock/data
                                            ↓
                                  dodatek do firmware P200
                                            ↓
                                  fabryczne funkcje wyjścia
```

Implementacja wykorzystuje istniejące połączenie clock/data do własnego łącza podczas pracy. Drugie Pico używane na początku do badania magistrali nie jest potrzebne do zwykłego sterowania: wystarczy **jedno Pico na zmodyfikowany P200**. USB Mass Storage służy aktualizacji firmware, nie zwykłemu sterowaniu. Interfejs debug MCU jest wyłączany przy starcie aplikacji, aby zwolnić używane piny.

Komendy SET zmieniają RAM przy wyjściu OFF. ON korzysta z odtworzonej fabrycznej funkcji i może zapisać nastawy fabrycznym kodem flash. Zachowano sprzężenie zwrotne regulatora, kod zabezpieczeń i kalibrację. Komendy USB wywołują odtworzone fabryczne funkcje OFF/AUTO; nie zapisują konfiguracji napięcia ani prądu PD.

## Sekwencja APPLY

APPLY pobiera aktualny stan w jednej sesji sprzętowej, sprawdza napięcie wejściowe, błędy i budżet źródła oraz zapamiętuje, czy główne wyjście było ON. Przy zmianie nastaw na włączonym wyjściu:

1. Wysyła OFF i potwierdza stan wyjścia.
2. Zapisuje napięcie i limit prądu w kolejności unikającej niedopuszczalnej pośredniej nastawy mocy.
3. Sprawdza obie nastawy niezależnym odczytem.
4. Ponownie kontroluje dostępny budżet mocy.
5. Przywraca ON tylko wtedy, gdy wyjście było wcześniej ON i wszystkie kontrole zakończyły się poprawnie.

Wyjście początkowo OFF pozostaje OFF. Identyczne nastawy nie powodują zbędnego przełączenia. Błąd OFF, SET lub odczytu nie wywołuje automatycznego ponowienia ON. **APPLY na chwilę przerywa zasilanie odbiornika**; płynna regulacja przy stale włączonym wyjściu nie została wdrożona.

Live jest opcjonalny. Komendy wykonują własne kontrole aktualnego stanu, więc stary pomiar w panelu lub wyłączony Live nie blokuje sam w sobie APPLY i OFF. Panel rozróżnia zmierzony prąd wyjściowy od ustawionego limitu prądu.

## Limity źródła i komend

Dodatek przyjmuje nastawy głównego wyjścia **1–30 V / 1–10 A**, z ograniczeniem **200 W**. To zakres akceptowanych komend, a nie potwierdzenie prób wszystkich wartości lub maksymalnego prądu pod obciążeniem.

Dla obecnego źródła **12 V / 5 A / 60 W** panel stosuje zachowawczy **wspólny budżet 54 W**. Przed dopuszczeniem nastawy głównego wyjścia uwzględnia zmierzony pobór USB. Zaktualizowane własne komendy głównego wyjścia i USB dopuszczają zmierzone wejście **11–28 V**, zachowując próg wejściowy, kontrolę błędów i fabryczne zabezpieczenia.

Obecny profil własnych komend USB wymaga **głównego OUTPUT OFF** i obejmuje **odbiorniki 5 V do 2 A**. AUTO przywraca fabryczną negocjację z odbiornikiem. Ręczny wybór napięcia i limitu prądu PD nie został wdrożony; rzeczywisty pobór prądu zależy od obciążenia.

## Wyniki walidacji

| Próba | Zaobserwowany wynik |
| --- | --- |
| Główne ON przy nastawach 5 V / 1 A | Multimetr potwierdził 5 V; sterowanie pozostało sprawne. |
| APPLY przy ON, 5 → 6 V / 1 A | Powrót do ON; odczyt P200 6,034 V, bez błędu. |
| Główne OFF | Niezależny odczyt potwierdził OFF. |
| USB OFF | TC64 zgasł; niezależny odczyt wskazał 0 V / 0 A. |
| USB AUTO | TC64 wrócił do pracy i pokazał 5,1 V / 1,4 A. |
| Drugi, działający egzemplarz | Użytkownik potwierdził stabilną pracę przez 30 minut i działające pokrętła. |

Nastawa limitu prądu została przesłana i odczytana. Te próby głównego wyjścia bez obciążenia **nie potwierdzają dokładności ograniczenia prądu pod obciążeniem**. Surowe przesunięcie zera przy OFF wynosiło około −3 mA; to obserwacja offsetu, nie prąd odbiornika.

Automatyczna walidacja integracji zakończyła się powodzeniem: **40 testów adaptera, sześć testów API, 18 przypadków interfejsu i dziesięć testów firmware ARM**. Testy ARM obejmują zmienione stałe kontroli wejścia i zachowane ścieżki komend. Pełny bezpośredni odczyt USB po każdej stronie aktualizacji zgadzał się ze sprawdzonym obrazem docelowym. Poprawka obsługi 12 V zmieniła sześć bajtów na trzech stronach po 1 KiB.

![Rzeczywisty panel P200 w Labrax po próbach](../public/images/p200-panel-20261010.png)

Zrzut jest zapisanym stanem z 10 października: główne OUTPUT OFF, USB AUTO. Nie jest bieżącym pomiarem przyrządu.

## Wnioski i dalsze prace

Wczesne operacje debugowania pamięci resetowały lub zamrażały pracujący zasilacz. Działająca komunikacja korzysta więc z własnego łącza GPIO, a nie ze sterowania pamięcią przez aktywne SWD. Mapowanie firmware ustalono przez bezpośredni odczyt i widoczne znaczniki startowe przed dodaniem komend sterujących.

Pierwszy P200 wyłączał się nieregularnie, również podczas prób bez obciążenia, więc został odłożony. Drugi egzemplarz działał podczas opisanych prób stabilności i sterowania. Wskazuje to na problem konkretnego egzemplarza, ale przyczyna pierwszego zasilacza nie została ustalona.

Sprawdzona implementacja nie obsługuje pełnego POWER całego urządzenia ani pracy po odłączeniu LCD. Obecne łącze przestaje odpowiadać po pełnym wyłączeniu; główne OUTPUT OFF nie jest wyłączeniem całego urządzenia. Kolejny P200 wymaga osobnej kopii, sprawdzenia zgodności i integracji. Docelowy plan to wspólne źródło 24 V dla Ridena i dwóch P200, każde P200 z własnym Pico oraz budżetem wspólnego źródła.

## Zakres publikacji

Repozytorium zawiera opis prac, źródła strony i zrzut panelu. Nie udostępnia zrzutów firmware producenta, kalibracji konkretnego urządzenia, identyfikatorów egzemplarzy ani danych dostępowych. To prototyp stanowiskowy, nie uniwersalny obraz do flashowania ani potwierdzenie działania na każdej rewizji P200. Podczas oryginalnych eksperymentów nie wykonano kopii bootloadera, a odzyskanie przez USB nie było gwarantowane.
