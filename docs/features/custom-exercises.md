---
id: custom-exercises
title: "Custom Exercises and Muscle Groups"
shortDescription: "Add exercises missing from the built-in list, with muscles, types, notes and an image. Let AI fill the muscles, and split or hide muscle groups."
category: "Exercises and equipment"
order: 20
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [custom-exercises-cloned, custom-exercises-muscle-groups]
---

## Where to create one

![The exercise picker with the Custom Exercises header and its Create link](/images/features/custom-exercises/custom-exercises-picker.webp)

Two places open the same form. In a workout, tap the **+** button after the last exercise. The exercise picker opens. Find the **Custom Exercises** header and tap **Create** next to it. Or go to **Me → Exercises** and tap **Create custom exercise**. The exercise picker in the program editor has the same header.

## Fill in the form

![The empty custom exercise form](/images/features/custom-exercises/custom-exercises-form.webp)

The form has a **Name**, an image, an **Autofill Muscles and Types** button, **Target Muscles**, **Synergist Muscles**, **Types** and **Exercise Notes**. Only the name is required. It cannot contain `/ { } ( ) # [ ] | ! :`. **Save** in the top right stays disabled until the name is valid. Notes take Markdown.

## Let AI fill the muscles and types

![The form after Autofill filled the muscles and types](/images/features/custom-exercises/custom-exercises-autofill.webp)

Type the name, then tap **Autofill Muscles and Types**. The app sends the name to the Liftosaur server, and an AI model picks the target muscles, the synergist muscles and the types. If the name is not a known exercise, the app says "Couldn't autofill the muscles for this exercise. Try a different name!". You can change any field by hand after that.

## Clone another exercise

![The Pick Exercise To Clone From sheet](/images/features/custom-exercises/custom-exercises-clone-library.webp)

Tap **Clone from another exercise** above the name. A sheet lists every built-in exercise, per equipment, and your other custom exercises. Search by name and tap one. The app copies its image, target muscles, synergist muscles and types into your form. The name stays the one you typed. Use this for a variation, like a "Paused Bench Press" cloned from **Bench Press**.

## Pick muscles and types by hand

![The Target Muscles sheet, grouped by muscle group](/images/features/custom-exercises/custom-exercises-target-muscles.webp)

Tap the **Target Muscles** or **Synergist Muscles** field. The sheet shows every muscle with a small image, grouped by muscle group, including your custom groups. Tap a muscle to select or unselect it, then tap **Done**. The **Types** field opens a list of **Core**, **Pull**, **Push**, **Legs**, **Upper** and **Lower**. The muscles count towards sets and volume per muscle group in the week stats and the graphs. The exercise picker filters use both the muscles and the types.

## Add an image

![The image source sheet](/images/features/custom-exercises/custom-exercises-image-source.webp) ![The Pick Exercise Image sheet](/images/features/custom-exercises/custom-exercises-image-library.webp)

Tap **Add image**. The sheet asks for a 2:3 aspect ratio and gives three sources:

- **From Image Library** opens the images of all built-in exercises, plus every image you uploaded before. Search by name and tap one.
- **From Camera** takes a photo with the phone camera.
- **From Photo Library** picks a photo from your phone.

Uploads need a signed-in account. Otherwise the app says "You need to be logged in to upload custom exercise images". On the web the second option is **Upload Image**, which picks a file from your computer. Once an image is set, tap **Change Image** to replace it. The image shows in the workout screen, in program previews and on the exercise stats screen.

## Use the exercise

![A workout with the new custom exercise added](/images/features/custom-exercises/custom-exercises-in-workout.webp)

Tap **Save**. The exercise appears under **Custom Exercises** in the picker. Select it and tap **Add to this workout**. In a program, write it by name like any built-in exercise:

```
Landmine Press / 3x10 / 60s
```

To edit it later, open the picker and tap the pencil icon next to the exercise. Renaming it updates your current program text too. The **Delete Exercise** button at the bottom of the form asks for a confirmation first. See [Liftoscript](/doc/liftoscript) for the program syntax.

## Custom muscle groups

![The Muscle Groups screen](/images/features/custom-exercises/custom-exercises-muscle-groups.webp)

Go to **Me → Muscle Groups**. The built-in groups are Shoulders, Triceps, Back, Abs, Glutes, Hamstrings, Quadriceps, Chest, Biceps, Calves and Forearms. Each row shows the group image, the name and its muscles. Tap **Add custom muscle group**, type a name, and tap **Add**. The new group starts with no muscles. Use this to split a built-in group, like Front, Side and Rear Delts instead of one Shoulders group. Custom groups get their own weekly volume graph and their own row in the week stats. The same editor opens from **Edit Muscle Groups** under **Weekly Sets Per Muscle Group** in the program editor's muscle settings, in the app and on the web.

## Choose the muscles in a group

Tap the pencil icon next to a group. The **Choose Muscles** sheet lists every muscle. Tap one to add or remove it, then tap **Done**. This works for built-in groups too, and a muscle can be in more than one group.

## Hide and restore built-in groups

![The Muscle Groups screen with Shoulders hidden and the Unhide link](/images/features/custom-exercises/custom-exercises-hidden-group.webp)

Tap the crossed eye icon on a built-in group to hide it. Tap the trash icon on a custom group to delete it. Hidden built-in groups are listed under **Unhide muscle groups:** at the bottom of the screen. Tap a name there to bring the group back.
