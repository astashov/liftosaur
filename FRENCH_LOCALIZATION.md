# Traduction française de Liftosaur

## Faisabilité et analyse du code

Analyse réalisée sur le commit `d23ff7c5eb642ae1ecd8f6c93d0a4926616e5cde` du dépôt
[astashov/liftosaur](https://github.com/astashov/liftosaur).

La traduction est possible. L’interface est écrite en TypeScript et React Native, avec React Native Web
pour la version navigateur. Les deux points d’entrée, `src/components/app.tsx` et `src/App.native.tsx`,
utilisent les mêmes composants pour l’essentiel des écrans. Une couche de traduction commune peut donc
servir les trois plateformes.

Le code analysé ne contient ni catalogue de langues ni sélection de langue de l’interface. Les textes
sont intégrés directement aux composants : titres de navigation dans `useNavOptions`, textes JSX,
libellés de menus et formulaires. La préférence doit être ajoutée à `ISettings` **et** au schéma Valibot
`VSettings` dans `src/types.ts`, sans quoi la validation des sauvegardes pourrait l’éliminer.

Une traduction doit distinguer l’affichage des données métier. Les noms anglais d’exercices servent
notamment à Liftoscript, à la recherche, aux programmes et aux liens de partage. Les traduire directement
dans `src/models/exercise.ts` risquerait de casser ces usages. Il faut également conserver les identifiants
de navigation, les clés du stockage et les noms utilisés par les tests et les statistiques de clics.

## Modification proposée et implémentée

- Ajout de `src/i18n/` : catalogue français, traduction avec paramètres nommés, contexte React et
  détection de la langue de l’appareil.
- Ajout d’un menu **Profil → Apparence → Langue**, avec **langue de l’appareil**, **English** et **Français**.
- Préférence enregistrée via l’action existante `UpdateSettings`. Elle reste facultative pour permettre
  la lecture des anciennes sauvegardes sans migration obligatoire.
- Détection du français à partir de la langue principale du navigateur ou de l’appareil. Les variantes
  comme `fr-FR`, `fr-CA` et `fr-MQ` sont acceptées ; les autres langues utilisent l’anglais.
- Ajout de `react-native-localize` pour la détection native. Les installations iOS doivent mettre à jour
  leurs pods après l’installation des dépendances, comme pour tout nouveau module natif.
- Mise à jour immédiate des composants, y compris ceux mémorisés. Le traducteur appartient au contexte
  de chaque arbre React, sans langue globale mutable partagée entre utilisateurs.
- Les clés du catalogue sont les textes anglais. L’anglais sert de repli. Les appels de traduction sont
  typés pour détecter les clés inconnues à la compilation.
- Ajout de `label` à `MenuItem`, `MenuItemEditable` et `GroupHeader` pour traduire l’affichage tout en
  conservant les noms utilisés par les identifiants de test et les événements.

Le catalogue comprend **734 entrées d’interface** et **218 noms d’exercices intégrés**. L’intégration
couvre notamment la navigation, l’accueil guidé, les paramètres, le compte, les minuteries, les formulaires,
les principales commandes de séance, les graphiques, les mensurations et une partie de l’éditeur de programme.

Les exercices sont traduits uniquement à l’affichage dans le sélecteur, la liste et les cartes de séance.
Le sélecteur accepte les noms français et anglais et retourne les exercices d’origine. Les exercices
personnalisés conservent le nom choisi par l’utilisateur. Les programmes, les sauvegardes et Liftoscript
conservent leurs noms canoniques et leurs commandes.

## Exemples de traduction

| Anglais | Français |
| --- | --- |
| Home | Accueil |
| Workout | Séance |
| Me | Profil |
| Available Equipment | Matériel disponible |
| Rest Timers | Minuteurs de repos |
| Personal Records | Records personnels |
| Bench Press | Développé couché |
| Deadlift | Soulevé de terre |
| Overhead Press | Développé militaire |
| Finish | Terminer |
| Save | Enregistrer |

RPE, AMRAP et 1RM conservent leurs abréviations usuelles. « Série », « répétition », « charge »,
« échauffement » et « séance » sont utilisés de façon cohérente dans les principaux libellés.

## Périmètre restant

Cette contribution constitue une première intégration étendue, **pas une traduction exhaustive de tous
les contenus du dépôt**. Certains messages dynamiques produits par les modèles et les opérations
asynchrones, les visites guidées, les aides détaillées, les notifications natives, l’interface Swift de
l’Apple Watch, les pages web indépendantes et certains écrans avancés restent à migrer. Les dates suivent
encore la locale existante de l’appareil plutôt que la préférence de l’application.

Les descriptions des programmes publiés, les documents juridiques, la documentation externe, les images
contenant du texte et le contenu créé par les utilisateurs restent dans leur langue d’origine. Les noms
canoniques peuvent encore apparaître dans l’éditeur et les aperçus de programmes.

Pour poursuivre, privilégier des phrases complètes avec paramètres nommés plutôt que la traduction mot
par mot. Ajouter la clé anglaise et sa traduction dans `fr.json`, puis appeler `useTranslation()` au point
d’affichage. Ne pas traduire les noms de routes, les identifiants, les valeurs internes des options, le
code Liftoscript ou les données des utilisateurs. Une relecture française en situation et des essais sur
appareils iOS et Android restent nécessaires avant une publication aux utilisateurs.

## Validation

Les tests ajoutés couvrent la détection et le choix explicite de langue, le repli anglais, les paramètres
nommés, les anciennes sauvegardes, la conservation de la préférence, la couverture des exercices intégrés,
les noms personnalisés, l’isolation de deux langues et le changement de langue de composants mémorisés.
Un test supplémentaire utilise les vrais écrans et le menu de langue de l’application.

La compilation TypeScript et le bundle web sont contrôlés séparément. Les tests de rendu natif exécutent
React Native avec les adaptateurs natifs simulés ; ils ne remplacent pas une compilation iOS ou Android.
La compilation web de validation est limitée à l’entrée `app`, sans copie des fichiers statiques et sans
minification. Elle vérifie l’intégration du code, pas un déploiement de production complet.

La suite générale n’est pas entièrement verte dans cet environnement. Le délai dépassé du test
`Health / ios syncMeasurements: writes returned anchor and bodyweight stat to storage` et l’échec du test
`mount / mirrors storage to the watch on mount, and makes no other native call` ont été reproduits sur
une copie intacte du commit d’origine. Les tests d’achats et de synchronisation ont également rencontré
des échecs ou des délais dépassés pendant la tentative de suite générale ; celle-ci a été interrompue.
Ces résultats ne sont pas présentés comme une validation complète de ces intégrations.

Vérifications finales de cette branche : **54 tests ciblés** et **3 tests de rendu** réussis,
compilation TypeScript sans erreur, lint des fichiers modifiés et ajoutés sans erreur et compilation
web de l’entrée `app` réussie. Le bundle non minifié émet les avertissements habituels de taille.
Aucune compilation sur appareil iOS ou Android n’a été réalisée ; CocoaPods n’est pas installé dans
cet environnement.
