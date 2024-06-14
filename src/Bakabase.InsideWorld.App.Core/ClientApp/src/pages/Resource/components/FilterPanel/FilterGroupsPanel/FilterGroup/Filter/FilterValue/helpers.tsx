import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Duration } from 'dayjs/plugin/duration';
import React from 'react';
import type { DataPool } from '../../../models';
import type { FilterValueContext } from './models';
import { RenderType } from './models';
import {
  BooleanValueRenderer,
  DateTimeValueRenderer,
  ListStringValueRenderer,
  NumberValueRenderer,
  StringValueRenderer,
} from '@/components/StandardValue';
import {
  BooleanValueEditor,
  ChoiceValueEditor,
  DateTimeValueEditor,
  MultilevelValueEditor,
  NumberValueEditor,
  StringValueEditor,
  TimeValueEditor,
} from '@/components/StandardValue';
import type { ChoicePropertyOptions, IProperty, MultilevelPropertyOptions } from '@/components/Property/models';
import { CustomPropertyType, ResourceProperty } from '@/sdk/constants';
import { findNodeChainInMultilevelData } from '@/components/StandardValue/helpers';
import type { MultilevelData } from '@/components/StandardValue/models';

export function getRenderType(property?: IProperty): RenderType | undefined {
  if (!property) {
    return;
  }
  if (property.isCustom) {
    switch (property.type as CustomPropertyType) {
      case CustomPropertyType.Tags:
        return RenderType.MultilevelValue;
      case CustomPropertyType.SingleLineText:
      case CustomPropertyType.MultilineText:
        return RenderType.StringValue;
      case CustomPropertyType.SingleChoice:
        return RenderType.ChoiceValue;
      case CustomPropertyType.MultipleChoice:
        return RenderType.MultipleChoiceValue;
      case CustomPropertyType.Number:
      case CustomPropertyType.Percentage:
      case CustomPropertyType.Rating:
        return RenderType.NumberValue;
      case CustomPropertyType.Boolean:
        return RenderType.BooleanValue;
      case CustomPropertyType.Link:
        return RenderType.StringValue;
      case CustomPropertyType.Attachment:
        break;
      case CustomPropertyType.Date:
        return RenderType.DateValue;
      case CustomPropertyType.DateTime:
        return RenderType.DateTimeValue;
      case CustomPropertyType.Time:
        return RenderType.TimeValue;
      case CustomPropertyType.Formula:
        break;
      case CustomPropertyType.Multilevel:
        return RenderType.MultilevelValue;
    }
  } else {
    const type = property.id as ResourceProperty;
    switch (type) {
      case ResourceProperty.FileName:
      case ResourceProperty.DirectoryPath:
        return RenderType.StringValue;
      case ResourceProperty.CreatedAt:
      case ResourceProperty.FileCreatedAt:
      case ResourceProperty.FileModifiedAt:
        return RenderType.DateTimeValue;
      case ResourceProperty.Category:
        break;
      case ResourceProperty.MediaLibrary:
        return RenderType.MediaLibrary;
      case ResourceProperty.Rating:
        return RenderType.NumberValue;
      case ResourceProperty.Introduction:
        return RenderType.StringValue;
    }
  }
  return;
}

function serializeValue(renderType: RenderType, value?: any): string | undefined {
  if (value === null || value === undefined) {
    return;
  }
  try {
    switch (renderType) {
      case RenderType.StringValue:
      case RenderType.MediaLibrary:
      case RenderType.ChoiceValue:
      case RenderType.MultipleChoiceValue:
      case RenderType.MultilevelValue:
      case RenderType.NumberValue:
      case RenderType.BooleanValue:
        return JSON.stringify(value);
      case RenderType.DateValue:
        return (value as Dayjs)?.format('YYYY-MM-DD');
      case RenderType.DateTimeValue:
        return (value as Dayjs)?.format('YYYY-MM-DD HH:mm:ss');
      case RenderType.TimeValue:
        return (value as Duration)?.format('HH:mm:ss');
    }
  } catch (e) {
    console.error(e);
    return;
  }
}

function deserializeValue(renderType: RenderType, value?: string): any {
  if (value === null || value === undefined || value.length == 0) {
    return;
  }
  try {
    switch (renderType) {
      case RenderType.StringValue:
      case RenderType.MediaLibrary:
      case RenderType.ChoiceValue:
      case RenderType.MultipleChoiceValue:
      case RenderType.MultilevelValue:
      case RenderType.NumberValue:
      case RenderType.BooleanValue:
        return JSON.parse(value);
      case RenderType.DateValue:
        return dayjs(value);
      case RenderType.DateTimeValue:
        return dayjs(value);
      case RenderType.TimeValue:
        return dayjs.duration(value);
    }
  } catch (e) {
    console.error(e);
    return;
  }
}


export function buildFilterValueContext(property: IProperty, value?: string, dataPool?: DataPool): FilterValueContext | undefined {
  const rt = getRenderType(property);
  if (!rt) {
    return;
  }
  const jo = deserializeValue(rt, value);
  const serialize = (v: any) => serializeValue(rt, v);

  switch (rt) {
    case RenderType.StringValue: {
      const typedValue = jo as string;
      return {
        renderValueRenderer: (props) => (<StringValueRenderer
          value={typedValue}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<StringValueEditor
          initValue={typedValue}
          onChange={v => onChange?.(serialize(v))}
          {...props}
        />),
      };
    }
    case RenderType.MediaLibrary:
    {
      const typedValue = jo as number[] ?? [];

      const categoryMap = dataPool?.categoryMap || {};
      const mediaLibraryMap = dataPool?.mediaLibraryMap || {};

      const displayValue: string[] = [];
      for (const id of typedValue) {
        const library = mediaLibraryMap[id];
        if (library) {
          const category = categoryMap[library.categoryId];
          displayValue.push(`[${category?.name}]${library.name}(${library.resourceCount})`);
        }
      }

      return {
        renderValueRenderer: (props) => <ListStringValueRenderer value={displayValue} {...props} />,
        renderValueEditor: ({ onChange, ...props }) => (<MultilevelValueEditor
          initValue={typedValue.map(v => v.toString())}
          getDataSource={async () => {
            const multilevelData: MultilevelData<string>[] = [];
            Object.values(categoryMap).forEach((c) => {
              const md: MultilevelData<string> = {
                value: `c-${c.id}`,
                label: c.name,
                children: Object.values(mediaLibraryMap)
                  .filter(l => l.categoryId == c.id)
                  .map<MultilevelData<string>>(x => ({
                    value: x.id.toString(),
                    label: x.name,
                  })),
              };

              multilevelData.push(md);
            });
            return multilevelData.filter(d => d.children && d.children.length > 0);
          }}
          onChange={v => {
            const newValue = v?.map(x => parseInt(x, 10));
            onChange?.(serialize(newValue));
          }}
          {...props}
        />) };
    }
    case RenderType.ChoiceValue: {
      const typedValue = jo as string;
      const displayValue = property.options?.choices?.find((c) => c.value === typedValue)?.label;
      return {
        renderValueRenderer: () => (<StringValueRenderer value={displayValue} />),
        renderValueEditor: () => (<ChoiceValueEditor
          initValue={typedValue == undefined || typedValue.length == 0 ? undefined : [typedValue]}
          multiple={false}
          getDataSource={async () => {
            const options = property.options as ChoicePropertyOptions;
            return options.choices?.map(c => ({ id: c.id!, value: c.value! }));
          }}
        />),
      };
    }
    case RenderType.MultipleChoiceValue: {
      const typedValue = jo as string[] ?? [];
      const displayValue = typedValue
        .map(v => property.options?.choices?.find((c) => c.value === v)?.label)
        .filter(x => x !== undefined && x?.length > 0);
      return {
        renderValueRenderer: (props) => (<ListStringValueRenderer
          value={displayValue}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<ChoiceValueEditor
          initValue={typedValue}
          multiple
          getDataSource={async () => {
            const options = property.options as ChoicePropertyOptions;
            return options.choices?.map(c => ({ id: c.id!, value: c.value! }));
          }}
          onChange={v => onChange?.(serialize(v))}
          {...props}
        />) };
    }
    case RenderType.MultilevelValue:
    {
      const typedValue = jo as string[] ?? [];
      const options = property.options as MultilevelPropertyOptions;
      const displayValue = typedValue
        .map(v => findNodeChainInMultilevelData(options.data || [], v)?.map(n => n.label).join(':'))
        .filter(x => x !== undefined && x?.length > 0) as string[];
      return {
        renderValueRenderer: (props) => (<ListStringValueRenderer
          value={displayValue}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<MultilevelValueEditor
          initValue={typedValue}
          getDataSource={async () => { return options.data; }}
          onChange={v => onChange?.(serialize(v))}
          {...props}
        />) };
    }
    case RenderType.NumberValue: {
      const typedValue = jo as number;
      return {
        renderValueRenderer: (props) => (<NumberValueRenderer
          value={typedValue}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<NumberValueEditor
          initValue={typedValue}
          onChange={v => onChange?.(serialize(v))}
          {...props}
        />),
      };
    }
    case RenderType.BooleanValue: {
      const typedValue = jo as boolean;
      return {
        renderValueRenderer: (props) => (<BooleanValueRenderer
          value={typedValue}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<BooleanValueEditor
          initValue={typedValue}
          onChange={v => onChange?.(serialize(v))}
          {...props}
        />),
      };
    }
    case RenderType.DateValue:
    {
      const stringDateTime = jo as string;
      let date: Dayjs | undefined;
      if (stringDateTime != undefined && stringDateTime.length > 0) {
        date = dayjs(stringDateTime);
      }
      return {
        renderValueRenderer: (props) => (<DateTimeValueRenderer
          value={date}
          format={'YYYY-MM-DD'}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<DateTimeValueEditor
          initValue={date}
          mode={'date'}
          onChange={v => onChange?.(serialize(v))}
        />),
      };
    }
    case RenderType.DateTimeValue:
    {
      const stringDateTime = jo as string;
      let date: Dayjs | undefined;
      if (stringDateTime != undefined && stringDateTime.length > 0) {
        date = dayjs(stringDateTime);
      }
      return {
        renderValueRenderer: (props) => (<DateTimeValueRenderer
          value={date}
          format={'YYYY-MM-DD HH:mm:ss'}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<DateTimeValueEditor
          initValue={date}
          mode={'datetime'}
          onChange={v => onChange?.(serialize(v))}
        />),
      };
    }
    case RenderType.TimeValue:
    {
      const stringTime = jo as string;
      let time: Duration | undefined;
      if (stringTime != undefined && stringTime.length > 0) {
        time = dayjs.duration(stringTime);
      }
      return {
        renderValueRenderer: (props) => (<DateTimeValueRenderer
          value={time}
          format={'HH:mm:ss'}
          {...props}
        />),
        renderValueEditor: ({ onChange, ...props }) => (<TimeValueEditor
          initValue={time}
          onChange={v => onChange?.(serialize(v))}
        />),
      };
    }
  }

  return;
}
