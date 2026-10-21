---
id: equipment-and-gyms
title: "Equipment, Plates and Gyms"
shortDescription: "Tell Liftosaur what bar, plates and fixed weights you have, and it rounds every target weight to what you can load. Keep a separate equipment list for each gym."
category: "Exercises and equipment"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-10-18"
screenshots: [equipment-and-gyms-barbell, equipment-and-gyms-gyms]
---

## Why a weight is crossed out

Your program asks for `60%` of a 135 lb 1RM, which is 81 lb. So the set shows 81 lb crossed out, and 80 lb underlined next to it.

Tap the underlined weight. The **Why is the weight adjusted?** popup shows the percentage and the 1RM, any kg to lb conversion, and how the equipment is set up. It draws the plates, the pin or the bands it picked. During a workout, **Edit equipment** at the bottom opens the equipment popup for that exercise.

By default the app rounds down. It picks the heaviest weight you can load that does not go over the target:

- Plates: the base plus the heaviest plate combination. 45 lb bar + 10 + 5 + 2.5 per side is 80 lb.
- Weight stack: the heaviest pin at or below the target.
- Fixed weights: the heaviest fixed weight at or below the target.
- Electric: the target rounded down to the next step.
- Bands: the heaviest band, or band combination, at or below the target.
- No equipment: the nearest multiple of the exercise's **Default Rounding**, 5 lb or 2.5 kg unless you change it.

When every weight is heavier than the target, the app picks the lightest one. A 5 lb target with 10, 15 and 20 lb kettlebells gives 10 lb.

Rounding happens on the workout screen only. Program state variables stay exact. With Premium, the expanded set also lists the plates for each side.

## Where your equipment lives

![Equipment Settings screen](/images/features/equipment-and-gyms/equipment-and-gyms-list.webp)

Go to **Me → Available Equipment**. Each row is one piece of equipment with its type and a short summary, like `Plates · 45 lb base` or `Weight stack · 10–200 by 10`. Tap a row to open its settings screen.

You start with these, in lb:

- **Barbell**, **Trap Bar** and **Smith Machine**: plates on a 45 lb bar.
- **EZ Bar**: plates on a 20 lb bar.
- **Leverage Machine**: plates on one side, no base weight.
- **Dumbbell**: fixed weights 5 to 100 lb in 5 lb steps.
- **Kettlebell**: fixed weights 10, 15, 20, 25, 30, 35 and 40 lb.
- **Cable**: a weight stack, 10 to 200 lb in 10 lb steps.
- **Band**: five bands, Yellow 10 lb, Red 25, Blue 40, Green 60 and Black 80, which you can combine.

In kg the bar is 20 kg (10 kg for the EZ bar) with 20, 10, 5, 2.5, 1.25 and 0.5 kg plates. Dumbbells go 2 to 10 kg by 2, then 12.5 to 50 kg by 2.5. Kettlebells are 4, 8, 12, 16 and 24 kg.

## The equipment screen

![Barbell settings with base weight, loading and plates](/images/features/equipment-and-gyms/equipment-and-gyms-barbell.webp)

The top card has a **Type** field with five choices: **Weight stack**, **Plates**, **Fixed weights**, **Electric** and **Bands**. Changing the type asks **Replace this setup?** first, because the old settings are lost. Custom equipment also has a **Name** field there.

Below are the fields for that type. Optional settings show as links at the bottom, like **Change rounding** or **Add notes**. Tap one to add its card. The **×** on a card removes it again.

If an edit makes the setup invalid, the app does not save it. An alert shows the reason, like `A range can't start above its end (50 → 20).`

### Try a weight

The **Try a weight** box stays at the bottom of the screen. Type a target, and it shows what the app would load for it, with the same drawing as in the workout. Under it you see the total and how far it is from the target, like `1 lb under 81 · rounded down`. An exact match shows **Exact**. The **-** and **+** keys step through the weights you can load.

### Plates

For barbells, plate-loaded machines and dip belts.

- **Base weight** is the empty bar, belt, vest or machine.
- **Loading** is **Both sides** or **One side**.
- **Plates you have · total count** lists each plate size and how many you own. A plate only counts when you have one for every side, so 3 plates of 45 lb count as 2 on a barbell.
- **Add a plate size** asks for a weight and adds 2 of it. The trash icon removes a size.

Optional cards:

- **Add horns (multi-horn plate-loaded machine)** adds a **Horns · plates are shared** card. Each horn has a ratio. Top 3 and Middle 1 puts three plates on Top for each one on Middle. You can have up to 3 horns.
- **Use fewer plates for warmups** adds a **Warmups use only** card. Warmup sets load only the sizes you switch on there. It starts with your two heaviest sizes.

### Weight stack

For cable columns and stack machines. The **Stack** card holds a range, like 10 → 200 by 10 lb. Tap **Add a different step for part of the stack** when the steps change, for example 2.5 lb steps at the top.

Optional cards:

- **Add built-in weights (lever, drop-down, knob)**: weights on the machine you can add, one per set.
- **Add plates you add (magnets, small blocks)**: small plates you combine with the pin. With built-in weights or added plates, **Skip add-ons in warmups** makes warmups use the stack only.
- **Add pull ratio**: for pulleys. **Stack says 100 lb, you pull** has **100 lb, same**, **50 lb, half** and **25 lb, quarter**.
- **Add weight that always lifts with the stack**: a handle or carriage the stack number does not include.
- **Add a second stack pinned together**: for two or more identical stacks you use at once. **Stacks** takes 2 to 4. The **Stack** card describes one stack, so 100 lb on two stacks shows **Pin 50 × 2**.
- **Show pin numbers instead of weights**: for stacks labelled 1, 2, 3 instead of a weight. The pin shows as **Pin #7**, counted from the lightest plate. **Try a weight** still shows the total.

### Fixed weights

![Kettlebell fixed weights list](/images/features/equipment-and-gyms/equipment-and-gyms-fixed.webp)

For dumbbells, kettlebells and fixed barbells. The **Weights** card holds ranges, like 5 → 50 by 5 lb. **Add another range** adds one. **Single weights outside the ranges** lists odd sizes, like a 110 lb dumbbell. **Add a single weight** adds one, and tapping a weight removes it.

**Add plates you add (fractional plates)** adds small plates that clip onto a fixed weight.

### Electric

For Voltra, Tonal and other motor machines. Enter **Min**, **Max** and **Step**. The app uses any weight from min to max in those steps, for example 5 to 200 lb by 1.

### Bands

The **Bands · what each counts as** card lists each band. A band has a color, a name, the weight it **counts as**, and how many you own. **Add a band** adds the next one, 10 lb heavier than your heaviest.

Turn on **Combine bands** to use two or more bands together, like Red + Blue.

## Rounding, unit and notes

Three optional cards work on every type.

**Change rounding** adds a **Round to** field:

- **Down** never goes heavier than the program says. This is the default.
- **Nearest** picks the closest weight you can load. With 45 lb plates down to 2.5, an 84 lb target becomes 85 lb.

**Use a different unit** adds a **Weights in** field with **lb** and **kg**. Pick **kg** for a machine with a kg stack in a lb gym.

The app asks how to change the numbers. **Convert (45 lb → 20 kg)** converts every weight. **Keep the numbers** only changes the label. Exercises on that equipment show kg in the workout and in history. Graphs stay in your app unit.

**Add notes** adds a **Notes** card for the seat height, the pin hole or other hints.

## When you switch lb and kg

Equipment follows your app unit unless you picked a unit for it. Switch **Me → Weight Units** from lb to kg, and that equipment converts with it. 45 lb plates become 20 kg, 25 lb become 10 kg, 10 lb become 5 kg.

Built-in equipment you never changed gets the kg defaults instead. The barbell becomes a 20 kg bar with 20, 10, 5, 2.5, 1.25 and 0.5 kg plates.

Equipment whose **Weights in** unit differs from the app unit keeps that unit. A kg cable stays in kg when your app is in lb.

## Bodyweight, weighted and assisted pull-ups

Each equipment type offers bodyweight options for pull-ups, dips and the like:

- **Include bodyweight (dip belt, vest)** adds your bodyweight to the load. It shows on plates and fixed weights.
- **Helps you up (assisted machine)** makes the load take weight off you. It shows on plates, weight stacks and bands.

Your bodyweight comes from **Me → Measurements**, and from Apple Health or Health Connect when that sync is on. The card shows how the app reads a program weight, like `Your bodyweight is 180 lb. 225 lb in a program means 45 lb added.` With no bodyweight logged, the app uses 80 kg.

**Weighted pull-ups.** Tap **Add New Equipment Type**, name it **Belt**, pick **Plates** and tap **Add**. Set **Base weight** to 0 and **Loading** to **One side**. Enter the plates you hang from the belt.

Tap **Include bodyweight (dip belt, vest)**. The **Weights include your bodyweight** card appears. Keep **Share of bodyweight** at 100%, or lower it for push-ups and other partial-bodyweight moves. Then attach **Belt** to Pull Up.

In the program, the weight is the extra load, and an `update` script adds your bodyweight when the workout starts:

```liftoscript
Pull Up / 3x8 25lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight + originalWeights[ns]
  }
~} / progress: lp(5lb)
```

At 180 lb, the sets show 205 lb, and the drawing shows 25 lb on the belt. A good session makes it 30 lb next time.

**Assisted pull-ups.** Add equipment named **Assist**, with the type **Weight stack**, and enter the machine's stack. Tap **Helps you up (assisted machine)**. The **Helps you up** card has **Program weights are**, with two choices:

- **Bodyweight − assistance**: the program weight is what you lift. This is the default.
- **Assistance, negative**: `-45 lb` in a program means 45 lb of assistance.

Keep **Bodyweight − assistance** and attach **Assist** to Pull Up, Leverage Machine. In the program, the weight is the assistance, and the script subtracts it:

```liftoscript
Pull Up, Leverage Machine / 3x8 50lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight - originalWeights[ns]
  }
~} / progress: lp(-5lb)
```

At 180 lb, the sets show 130 lb, and the stack shows pin 50. A good session lowers the assistance to 45 lb. With **Down** rounding, the app rounds the assistance down, so the set is never easier than the program says. The **Why is the weight adjusted?** popup says when the equipment helps you up.

For band-assisted pull-ups, use the **Bands** type the same way. Turn on **Combine bands** to let the app pick a pair, like Blue + Red for 65 lb of help.

**Plain bodyweight.** Write `0lb` and keep the `update` script, so the sets show your bodyweight and the history records it. See [Progressions](/features/progressions) for `update` scripts and the `bodyweight` variable.

## Hide equipment you do not have

![Hidden Equipment line at the end of the list](/images/features/equipment-and-gyms/equipment-and-gyms-hidden.webp)

Tap the eye icon on a built-in row to hide it. Hidden rows collect in one line at the bottom, **Hidden Equipment: Smith Machine**. Tap the name there to bring it back.

By default the exercise picker leaves out every exercise that uses hidden equipment, so a gym without a Smith machine never offers Smith machine exercises. To see them anyway, open the filter screen in the picker and turn off **Show only available equipment**. The switch is remembered until you change it back.

## Add your own equipment

![Custom equipment row and the Add New Equipment Type link](/images/features/equipment-and-gyms/equipment-and-gyms-custom.webp)

Tap **Add New Equipment Type**. Enter an **Equipment name**, pick a **Type** and tap **Add**. The settings screen opens with that type's defaults:

- **Plates**: a 45 lb base with 45, 25, 10, 5 and 2.5 lb plates.
- **Weight stack**: 10 to 200 lb by 10.
- **Fixed weights**: 5 to 50 lb by 5.
- **Electric**: 5 to 200 lb by 1.
- **Bands**: Yellow, Red, Blue, Green and Black bands, not combined.

The trash icon on the row deletes custom equipment after **Are you sure?**.

## Attach equipment to an exercise

![Exercise settings with equipment per gym](/images/features/equipment-and-gyms/equipment-and-gyms-exercise.webp)

Each exercise uses its built-in equipment unless you change it. Bench Press uses the Barbell.

During a workout, tap the **Equipment:** link under the exercise name. The popup lists **None** and every visible piece of equipment in the current gym. With **None**, it shows the **Default Rounding** field instead.

The same settings live in **Me → Exercises**. Tap an exercise to open its stats page. **Default Rounding** applies when no equipment is set. Below it is one equipment field per gym, under **Equipments for each Gym**.

Program scripts can step by your plates too:

```liftoscript
weights[1] = increment(completedWeights[1]);
```

`increment` and `decrement` return the next or previous weight you can load with the exercise's equipment. See [Liftoscript](/doc/liftoscript) for the rest.

## More than one gym

![Gyms screen with two gyms](/images/features/equipment-and-gyms/equipment-and-gyms-gyms.webp)

Tap **Manage Gyms** at the top of the equipment screen, then **Add Gym**. Name it and tap **Add**. The new gym gets the default equipment list.

On the **Gyms** screen, the pencil opens that gym's equipment, with a **Gym Name** field on top. The copy icon duplicates the gym with its equipment. The trash deletes it, and only shows with more than one gym.

## Switch gyms

With two or more gyms, **Me** gets a **Current Gym** field. Pick a gym there, and every exercise switches to the equipment you attached for that gym. **Available Equipment** now opens the **Gyms** screen first.

A travel gym needs no setup. Leave its exercises on **None**, and the app rounds to **Default Rounding** until you are back.
