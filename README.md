# Tarkov Map — интерактивная карта

Карта открыта для всех без входа. Вход для администратора скрыт: **двойное нажатие на иконку ⚙** в правом верхнем углу.

## Ссылки на метки
Формат: `index.html#map=woods&level=0&marker=ID` — открывается на любом устройстве, карта и этаж берутся из ссылки.
Старые ссылки `#marker=ID` тоже работают (карта ищется автоматически).

## Firebase Rules (ОБЯЗАТЕЛЬНО)
Чтение карты без входа и запись только админам. Пример — проверьте в Rules Playground и адаптируйте под свои поля:

```json
{
  "rules": {
    "maps": {
      ".read": true,
      "$map": {
        "markers": {
          ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
        }
      }
    },
    "users": {
      ".read":  "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid && !data.exists() && newData.child('role').val() === 'user' && newData.child('banned').val() === false",
        "nickname": { ".write": "auth.uid === $uid" },
        "photoURL": { ".write": "auth.uid === $uid" }
      }
    }
  }
}
```
Если пользователь сам сбрасывает `accessLevel` по истечении срока (auth.js), добавьте для этого поля отдельное правило.

Также ограничьте API-ключ Firebase по домену сайта в Google Cloud Console → Credentials.
