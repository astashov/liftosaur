import { h, JSX, Fragment } from "preact";
import { IconArrowRight } from "./icons/iconArrowRight";
import { StringUtils } from "../utils/string";
import { IconExternalLink } from "./icons/iconExternalLink";
import { InternalLink } from "../internalLink";
import { Tailwind } from "../utils/tailwindConfig";

type IMenuItemRight = "arrow" | "external";

interface IMenuItemProps {
  title: string;
  icon?: JSX.Element;
  value?: string;
  type?: { type: "external" | "internal"; href: string };
  subtitle?: string;
  right?: IMenuItemRight;
  onClick?: (e: MouseEvent) => void;
}

interface IMenuItemGroupProps {
  title?: string;
  name: string;
  items: IMenuItemProps[];
}

export function MenuItemGroup(props: IMenuItemGroupProps): JSX.Element {
  return (
    <div data-cy={`menu-item-group-${props.name}`}>
      {props.title && <div className="mb-1 text-grayv3-main">{props.title}</div>}
      <div className="border rounded-lg bg-grayv3-50 border-grayv3-200">
        {props.items.map((item, i) => {
          const key = StringUtils.dashcase(item.title);
          if (item.type?.type === "external") {
            return (
              <a
                key={key}
                data-cy={`menu-item-${key}`}
                href={item.type.href}
                target="_blank"
                className={`flex items-center w-full gap-3 px-4`}
              >
                <MenuItemContent i={i} item={item} />
              </a>
            );
          } else if (item.type?.type === "internal") {
            return (
              <InternalLink
                name={key}
                key={key}
                href={item.type.href}
                className={`flex items-center w-full gap-3 px-4`}
              >
                <MenuItemContent i={i} item={item} />
              </InternalLink>
            );
          } else {
            return (
              <button
                key={key}
                data-cy={`menu-item-${key}`}
                className={`flex items-center w-full gap-3 px-4`}
                onClick={item.onClick}
              >
                <MenuItemContent i={i} item={item} />
              </button>
            );
          }
        })}
      </div>
    </div>
  );
}

interface IMenuItemContentProps {
  i: number;
  item: IMenuItemProps;
}

function MenuItemContent(props: IMenuItemContentProps): JSX.Element {
  const { i, item } = props;
  return (
    <>
      {item.icon && <div>{item.icon}</div>}
      <div
        className={`flex-1 py-1 flex items-center gap-3 ${i !== 0 ? "border-t border-grayv3-200" : ""}`}
        style={{ minHeight: "3rem" }}
      >
        <div className="text-left">
          <div className="font-semibold">{item.title}</div>
          {item.subtitle && <div className="text-xs text-grayv3-main">{item.subtitle}</div>}
        </div>
        <div className="ml-auto">
          <div className="text-sm text-left text-grayv3-main">{item.value}</div>
        </div>
        {item.right === "arrow" && (
          <div style={{ minWidth: "10px" }}>
            <IconArrowRight />
          </div>
        )}
        {item.right === "external" && (
          <div style={{ minWidth: "10px" }}>
            <IconExternalLink color={Tailwind.colors().grayv3.main} />
          </div>
        )}
      </div>
    </>
  );
}
