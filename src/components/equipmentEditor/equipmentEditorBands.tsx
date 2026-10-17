import { JSX, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { TextInput } from "../primitives/textInput";
import { InputNumber2 } from "../inputNumber2";
import { AddButton } from "../addButton";
import { MenuItemEditable } from "../menuItemEditable";
import { IBandsSetup, IEquipmentBand, IUnit } from "../../types";
import {
  EquipmentSetupEdit_addBand,
  EquipmentSetupEdit_bandColor,
  EquipmentSetupEdit_bandColorName,
  EquipmentSetupEdit_bandColors,
  EquipmentSetupEdit_removeBand,
  EquipmentSetupEdit_updateBand,
  IEquipmentBandColor,
} from "../../models/equipmentSetupEdit";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { EquipmentEditorActions, EquipmentEditorCard, EquipmentEditorRemove } from "./equipmentEditorParts";
import {
  EquipmentEditorBodyweightActions,
  EquipmentEditorBodyweightCard,
  IEquipmentEditorSectionProps,
} from "./equipmentEditorShared";

export function EquipmentEditorBands(props: IEquipmentEditorSectionProps<IBandsSetup>): JSX.Element {
  const { setup, onChange } = props;
  const [pickingColorIndex, setPickingColorIndex] = useState<number | undefined>(undefined);
  const updateBand = (index: number, patch: Partial<IEquipmentBand>): void => {
    onChange({ ...setup, bands: EquipmentSetupEdit_updateBand(setup.bands, index, patch) });
  };
  return (
    <View>
      <EquipmentEditorCard title="Bands · what each counts as">
        {setup.bands.map((band, index) => (
          <EquipmentEditorBandRow
            key={index}
            band={band}
            index={index}
            unit={setup.unit}
            isPickingColor={pickingColorIndex === index}
            onTogglePicker={() => setPickingColorIndex(pickingColorIndex === index ? undefined : index)}
            onChange={(patch) => {
              updateBand(index, patch);
              if (patch.color != null) {
                setPickingColorIndex(undefined);
              }
            }}
            onRemove={() => {
              setPickingColorIndex(undefined);
              onChange({ ...setup, bands: EquipmentSetupEdit_removeBand(setup.bands, index) });
            }}
          />
        ))}
        <AddButton
          name="equipment-add-band"
          label="Add a band"
          onClick={() => onChange({ ...setup, bands: EquipmentSetupEdit_addBand(setup.bands, setup.unit) })}
        />
      </EquipmentEditorCard>
      <EquipmentEditorCard help="Use two or more bands together, e.g. Red + Blue.">
        <MenuItemEditable
          name="Combine bands"
          type="boolean"
          isBorderless={true}
          value={setup.combine ? "true" : "false"}
          onChange={(value) => onChange({ ...setup, combine: value === "true" })}
        />
      </EquipmentEditorCard>
      <EquipmentEditorBodyweightCard {...props} />
      {props.extraCards}
      <EquipmentEditorActions
        actions={[...EquipmentEditorBodyweightActions(props, ["assists"]), ...props.extraActions]}
      />
    </View>
  );
}

interface IBandRowProps {
  band: IEquipmentBand;
  index: number;
  unit: IUnit;
  isPickingColor: boolean;
  onTogglePicker: () => void;
  onChange: (patch: Partial<IEquipmentBand>) => void;
  onRemove: () => void;
}

function EquipmentEditorBandRow(props: IBandRowProps): JSX.Element {
  const { band, index } = props;
  const nameRef = useRef(band.name);
  return (
    <View className="py-2 border-b border-border-cardpurple">
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <BandSwatch
          color={EquipmentSetupEdit_bandColor(band)}
          isSelected={props.isPickingColor}
          testID={`equipment-band-color-${index}`}
          onPress={props.onTogglePicker}
        />
        <TextInput
          key={band.name}
          className="flex-1 px-2 text-sm border rounded h-scaled-6 border-border-prominent bg-background-default text-text-primary"
          style={{ paddingVertical: 0, includeFontPadding: false }}
          testID={`equipment-band-name-${index}`}
          data-testid={`equipment-band-name-${index}`}
          defaultValue={band.name}
          onChangeText={(text) => {
            nameRef.current = text;
          }}
          onBlur={() => props.onChange({ name: nameRef.current })}
        />
        <EquipmentEditorRemove testID={`equipment-band-remove-${index}`} onPress={props.onRemove} />
      </View>
      {props.isPickingColor && (
        <View className="flex-row flex-wrap py-2" style={{ gap: 10 }}>
          {EquipmentSetupEdit_bandColors.map((color) => (
            <BandSwatch
              key={color}
              color={color}
              isSelected={color === EquipmentSetupEdit_bandColor(band)}
              testID={`equipment-band-${index}-pick-${color}`}
              label={EquipmentSetupEdit_bandColorName(color)}
              onPress={() => props.onChange({ color })}
            />
          ))}
        </View>
      )}
      <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
        <Text className="text-sm text-text-secondary">counts as</Text>
        <InputNumber2
          name={`equipment-band-weight-${index}`}
          testID={`equipment-band-weight-${index}`}
          width={4}
          allowDot={true}
          value={band.weight}
          onBlur={(weight) => weight != null && props.onChange({ weight })}
        />
        <Text className="text-sm text-text-secondary">{props.unit}</Text>
        <Text className="ml-3 text-sm text-text-secondary">×</Text>
        <InputNumber2
          name={`equipment-band-count-${index}`}
          testID={`equipment-band-count-${index}`}
          width={3}
          min={1}
          step={1}
          value={band.num}
          onBlur={(num) => num != null && props.onChange({ num })}
        />
      </View>
    </View>
  );
}

function BandSwatch(props: {
  color: IEquipmentBandColor;
  isSelected: boolean;
  testID: string;
  label?: string;
  onPress: () => void;
}): JSX.Element {
  const colors = Tailwind_semantic();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label ?? EquipmentSetupEdit_bandColorName(props.color)}
      testID={props.testID}
      data-testid={props.testID}
      className="items-center justify-center w-7 h-7 rounded-full"
      style={{
        borderWidth: 2,
        borderColor: props.isSelected ? colors.border.purple : "transparent",
      }}
      onPress={props.onPress}
    >
      <View className="w-5 h-5 rounded-full" style={{ backgroundColor: colors.band[props.color] }} />
    </Pressable>
  );
}
