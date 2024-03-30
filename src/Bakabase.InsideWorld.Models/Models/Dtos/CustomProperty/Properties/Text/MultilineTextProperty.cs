﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Bakabase.InsideWorld.Models.Constants;
using Bakabase.InsideWorld.Models.Models.Dtos.CustomProperty.Abstractions;

namespace Bakabase.InsideWorld.Models.Models.Dtos.CustomProperty.Properties.Text
{
    public record MultilineTextProperty : TextProperty;

    public record MultilineTextPropertyValue : TextPropertyValue;

    public class MultilineTextPropertyDescriptor : TextPropertyDescriptor
    {
        public override CustomPropertyType Type => CustomPropertyType.MultilineText;
    }
}
