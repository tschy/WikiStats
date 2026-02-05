# 29.1.2026
Wir machen etwas mit Daten/Metriken von Wikimedia/Wikipedia


Bsp. Graph fuer Revision history bestimmter Seiten

plot: Wann welche Aenderungen vorgenommen wurden an einem Artikel
mit Eingabe/Abfrage von aussen (Angabe der Artikel)


 okhttp log. exception handler, we need the response body oder in der konfiguration mitteilen, was on error passieren soll



revisions zw. 20 und mehr, mit schleife rueber gehen und alle holen


https://api.wikimedia.org/wiki/Core_REST_API/Reference/Revisions/Get_page_history

https://api.wikimedia.org/wiki/Special:AppManagement

https://api.wikimedia.org/wiki/Core_REST_API

https://api.wikimedia.org/wiki/API_catalog

curl -v "https://api.wikimedia.org/core/v1/wikipedia/en/page/Earth/history?filter=bot&older_than=981126172"


curl https://en.wikipedia.org/core/v1/wikipedia/en/page/Earth/history?filter=bot


https://claude.ai/chat/c3474232-6373-48c2-b22b-6a72b2774483


# 5.2.2026

## Backend
1. Neue Main-Methode statt Spring Boot die mehrere Artikel runterlaedt und vorbearbeitet und direkt in
frontend/public/data/ abspeichert
2. optional: Monate und Jahre am 1.1. beginnen

## Frontend
1. Remove API calls, use files
2. New visualisation 1 colour per user 
3. every user below top x aggregated into 'other'
4. zwei Diagramme in einem: horizontale Achse soll oben das delta haben, unten die Anzahl der Edits pro User
   (ansonsten zwei Diagramme erstellen - vorher mit AI reden, Chart.js-Moeglichkeiten explorieren)
Kann man eine Achse drehen/spiegeln, so dass die negativen oben und die positiven unten sind  https://energy-charts.info/charts/power/chart.htm?l=de&c=DE
oberhalb der x-Achse die deltas, unterhalb gespiegelt Anzahl der revisions per user (count)
x im Frontend als Variable, x kann zwischen 10 und 20 starten, alle die nicht top x sind zusammenfassen
data class Stats.Interval ist die x-Achse, data class UserSTats.user sind die y-Werte


zu ueberlegen/Phase 2 - Ideensammlung
6. (Phase 2 - wenn ein User in beiden Nachbar-Intervallen im top x ist kann er 
5. top 10 bestimmen fuer den Gesamtzeitraum. -> Im Frontend aggregieren
6. fuer jedes Jahr die top x bestimmen, im Backend , speichern irgendwo, in der Anzeige alle Jahre die gerade im View sind und einen Union ueber die top x user machen
top x berechnen wenn sich x aendert, cachen. x erstmal als Konstante = 10. Top 3 * x berechnen

farbpalette erstellen lassen, gut unterscheidbar aber zusammen passend. farben sollen sich nicht aendern
wenn man zur seite scrollt. y = 3 * x


theoretisch frontend deployen, oder zusammen
