# Liftosaur architecture

It's a web app, with 2 native apps - thin wrappers that implement some native features and render the webview with this app. The web app is a PWA.

It's written in Preact, TypeScript, Tailwind CSS. For the text editing of Liftoscript it uses CodeMirror 6, and it uses Lezer for syntax highlighting, as well as for parser and lexer. Evaluator of the Liftosript is custom, but uses Lezer for parsing/lexing under the hood.

The state management is custom, similar to Redux. It has one global storage, and syncs on each change to IndexedDB. It does have a reducer, where it handles the action and returns the new state, but also most of the actions just use `lens-shmens` package. It allows you to describe the changes in the global state via functional lens, that are composed to modify the state. For example, you can do:

```
dispatch(lb<IState()>.p("state").p("storage").p("settings").p("units").record("lb"))
```

And it will update the unit in settings (state.storage.settings.units) to "lb" value. Because it's composed like that - during update it recreates the changed parts (state is immutable), but only the parts that got changed. Also, because of composing lenses like that - we can log what exactly we were changing, and if error happens - we'll see during what change operation it happened.

We prefer to store ALL of the state (except maybe little things like tooltips opened state, etc) in the global state, because it allows us to restore the state by just loading that JSON with the state - very good for debugging - we can take the state of other users and load into the app, and reproduce their issues.

The app uses [Liftoscript](https://www.liftosaur.com/docs) as a domain-specific language for weightlifting programs. Liftoscript is a scripting/markup language that allows users to define their weightlifting routines in a text format. It supports basic scripting capabilities like conditionals and loops, but is primarily focused on numbers, percentages, and weight values. The evaluators of the liftoscript are in the `liftoscriptEvaluator.ts` and `plannerExerciseEvaluator.ts` files. After evaluating the program, there's series of post processing steps, to resolve/fill repeats, reuses, etc, mostly happening in `plannerEvaluator.ts`

The app can work offline, it does that by serving previous versions of index.js and vendor.js that is stored on disk on app opening, and then downloading the new versions of those files in the background. It also uses service worker to cache the static assets.

The server part of the app is stored in the `lambda` directory. The whole server-side app is just one AWS lambda function, that uses custom router to route the requests. It uses DynamoDB for the database, S3, SES, etc. The setup is in the `liftosaur-cdk/liftosaur-cdk.ts` file.




