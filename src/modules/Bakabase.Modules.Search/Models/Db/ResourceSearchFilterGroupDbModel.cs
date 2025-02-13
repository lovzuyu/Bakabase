﻿using Bakabase.Abstractions.Components.Search;
using Bakabase.Abstractions.Models.Domain.Constants;

namespace Bakabase.Modules.Search.Models.Db;

public record
    ResourceSearchFilterGroupDbModel : IFilterExtractable<ResourceSearchFilterGroupDbModel, ResourceSearchFilterDbModel>
{
    public SearchCombinator Combinator { get; set; }
    public List<ResourceSearchFilterGroupDbModel>? Groups { get; set; }
    public List<ResourceSearchFilterDbModel>? Filters { get; set; }
    public bool Disabled { get; set; }
}