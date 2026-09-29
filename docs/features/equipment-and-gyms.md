---
id: equipment-and-gyms
title: "Equipment, Plates and Gyms"
shortDescription: "Tell Liftosaur what bar, plates and fixed weights you have, and it rounds every target weight to what you can load. Keep a separate equipment list for each gym."
category: "Exercises and equipment"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [equipment-and-gyms-barbell, equipment-and-gyms-gyms]
---

## Why a weight is crossed out

Your program asks for `60%` of a 135 lb 1RM, which is 81 lb. So the set shows 81 lb crossed out, and 80 lb underlined next to it.

Tap the underlined weight. The **Why is the weight adjusted?** popup shows the percentage and the 1RM, any kg to lb conversion, the bar weight, and the plates per side.

The rule for each kind of equipment:

- Bar and plates: the bar plus the heaviest plate combination that does not go over the target. 45 lb bar + 10 + 5 + 2.5 per side is 80 lb.
- Fixed weights: the heaviest fixed weight that does not go over the target, or the lightest one if all are heavier.
- No equipment: the nearest multiple of the exercise's **Default Rounding**, 5 lb or 2.5 kg unless you change it.

Rounding happens on the workout screen only. Program state variables stay exact. With Premium, the expanded set also lists the plates for each side.

## Where your equipment lives

![Equipment Settings screen](/images/features/equipment-and-gyms/equipment-and-gyms-list.webp)

Go to **Me → Available Equipment**. Each row is one piece of equipment with a summary, like `Bar: 45 lb · 45 lb×8, 25 lb×4`. Tap the arrow to expand it.

You start with **Barbell**, **Trap Bar**, **Leverage Machine**, **Smith Machine**, **Dumbbell**, **EZ Bar**, **Cable** and **Kettlebell**.

## Set the bar, plates and sides

![Barbell settings with bar weight, sides and plates](/images/features/equipment-and-gyms/equipment-and-gyms-barbell.webp)

Expand a row to edit it:

- **Bar** is the weight of the empty bar or machine.
- **Sides** is how many sides take plates, 1 to 4. A barbell has 2. A machine with one peg has 1.
- **Number of Barbell plates available** lists each plate weight and how many you own in total. A plate only counts when you have one for every side, so 3 plates of 45 lb count as 2 on a barbell.
- **Add New Plate Weight** asks for a weight and adds it with a count of 2. The trash icon on a plate row removes that weight.

## Fixed weights

![Kettlebell fixed weights list](/images/features/equipment-and-gyms/equipment-and-gyms-fixed.webp)

Dumbbells, kettlebells and weight stacks come in fixed steps. Turn on **Is Fixed Weight** for that row. The plate fields go away, and **Available fixed weight for Kettlebell** lists one line per weight. **Add New Fixed Weight** adds one, the trash icon removes one.

## lb or kg per equipment

Every row has a **Unit** field: **Default**, **lb** or **kg**. Pick **kg** for a machine with a kg stack in a lb gym. Exercises on that equipment show kg in the workout and in history. Graphs stay in your default unit.

## Bodyweight, weighted and assisted pull-ups

Two switches on each plate-loaded row cover pull-ups, dips and the like. **Bodyweight for Bar** uses your current bodyweight as the bar, and the **Bar** field turns gray to show it. **Is assisting?** makes the plates reduce the total instead of adding to it. Your bodyweight comes from **Me → Measurements**, and from Apple Health or Health Connect when that sync is on.

**Weighted pull-ups.** Add a custom equipment, for example **Belt**, turn on **Bodyweight for Bar**, leave **Is assisting?** off, and enter the plates you hang from the belt. In the program, the weight is the extra load, and an `update` script adds your bodyweight when the workout starts:

```liftoscript
Pull Up, Belt / 3x8 25lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight + originalWeights[ns]
  }
~} / progress: lp(5lb)
```

The sets show bodyweight plus 25 lb, the plates calculator shows what to hang, and a good session makes it 30 lb next time.

**Assisted pull-ups.** Use the assisted machine equipment, or a custom one, turn on both **Bodyweight for Bar** and **Is assisting?**, and enter the machine's stack as plates. For bands, add one "plate" per band with the weight it takes off. In the program, the weight is the assistance, and the script subtracts it:

```liftoscript
Pull Up, Leverage Machine / 3x8 50lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight - originalWeights[ns]
  }
~} / progress: lp(-5lb)
```

A good session lowers the assistance to 45 lb. If a weight drops to 0 by surprise, the **Why is the weight adjusted?** popup says when **Is assisting?** is the reason.

**Plain bodyweight.** Write `0lb` and keep the `update` script, so the sets show your bodyweight and the history records it. See [Progressions](/features/progressions) for `update` scripts and the `bodyweight` variable.

## Hide equipment you do not have

![Hidden Equipment line at the end of the list](/images/features/equipment-and-gyms/equipment-and-gyms-hidden.webp)

Tap the eye icon on a built-in row to hide it. Hidden rows collect in one line at the bottom, **Hidden Equipment: Smith Machine**. Tap the name there to bring it back.

By default the exercise picker leaves out every exercise that uses hidden equipment, so a gym without a Smith machine never offers Smith machine exercises. To see them anyway, open the filter screen in the picker and turn off **Show only available equipment**. The switch is remembered until you change it back.

## Add your own equipment

![Custom equipment row and the Add New Equipment Type link](/images/features/equipment-and-gyms/equipment-and-gyms-custom.webp)

Tap **Add New Equipment Type**, enter a name and tap **Add**. The new row starts with a 0 lb bar and four 10 lb plates. Expand it to rename it and set its plates. The trash icon deletes it after **Are you sure?**.

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
