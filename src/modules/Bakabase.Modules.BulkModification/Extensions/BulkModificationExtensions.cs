﻿using Bakabase.Abstractions.Components.Configuration;
using Bakabase.Abstractions.Extensions;
using Bakabase.Abstractions.Models.Db;
using Bakabase.Abstractions.Models.Domain;
using Bakabase.Abstractions.Models.Domain.Constants;
using Bakabase.Modules.BulkModification.Abstractions.Components;
using Bakabase.Modules.BulkModification.Abstractions.Models;
using Bakabase.Modules.BulkModification.Components;
using Bakabase.Modules.BulkModification.Models.Db;
using Bakabase.Modules.Property.Abstractions.Services;
using Bakabase.Modules.Property.Extensions;
using Bakabase.Modules.Search.Extensions;
using Bakabase.Modules.Search.Models.Db;
using Bakabase.Modules.StandardValue.Abstractions.Configurations;
using Bakabase.Modules.StandardValue.Extensions;
using Bootstrap.Extensions;
using Humanizer;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using BulkModificationVariable = Bakabase.Modules.BulkModification.Abstractions.Models.BulkModificationVariable;

namespace Bakabase.Modules.BulkModification.Extensions;

public static class BulkModificationExtensions
{
    public static async Task<List<Abstractions.Models.BulkModification>> ToDomainModels(
        this List<BulkModificationDbModel> dbModels,
        IPropertyService propertyService)
    {
        var filterGroupDbModels = dbModels
            .Select(d => d.Filter.JsonDeserializeOrDefault<ResourceSearchFilterGroupDbModel>()).ToList();
        var processesDbModels = dbModels
            .Select(d => d.Processes.JsonDeserializeOrDefault<List<BulkModificationProcessDbModel>>()).ToList();
        var variablesDbModels =
            dbModels.Select(d => d.Variables.JsonDeserializeOrDefault<List<BulkModificationVariableDbModel>>())
                .ToList();

        var propertyPools =
            filterGroupDbModels.SelectMany(x => x?.ExtractFilters().Select(f => f.PropertyPool) ?? [])
                .OfType<PropertyPool>()
                .Concat(processesDbModels.SelectMany(x => x?.Select(p => p.PropertyPool) ?? []))
                .Concat(variablesDbModels.SelectMany(x => x?.Select(v => v.PropertyPool) ?? []))
                .Aggregate((PropertyPool) 0, (pool, propertyPool) => pool | propertyPool);

        var propertyMap = (await propertyService.GetProperties(propertyPools)).GroupBy(d => d.Pool)
            .ToDictionary(d => d.Key, d => d.ToDictionary(a => a.Id, a => a));

        return dbModels.Select((dbModel, i) => new Abstractions.Models.BulkModification
        {
            // AppliedAt = dbModel.AppliedAt,
            // CalculatedAt = dbModel.CalculatedAt,
            // RevertedAt = dbModel.RevertedAt,
            // FilteredAt = dbModel.FilteredAt,
            CreatedAt = dbModel.CreatedAt,
            Id = dbModel.Id,
            Name = dbModel.Name,
            IsActive = dbModel.IsActive,
            FilteredResourceIds = dbModel.FilteredResourceIds.JsonDeserializeOrDefault<List<int>>(),
            Filter = filterGroupDbModels[i]?.ToDomainModel(propertyMap),
            Processes = processesDbModels[i]?.Select(p => p.ToDomainModel(propertyMap)).ToList(),
            Variables = variablesDbModels[i]?.Select(v => v.ToDomainModel(propertyMap)).ToList()
        }).ToList();
    }

    public static async Task<Abstractions.Models.BulkModification> ToDomainModel(this BulkModificationDbModel dbModel,
        IPropertyService propertyService) =>
        (await new List<BulkModificationDbModel> {dbModel}.ToDomainModels(propertyService))[0];

    private static BulkModificationVariable ToDomainModel(this BulkModificationVariableDbModel dbModel,
        Dictionary<PropertyPool, Dictionary<int, Bakabase.Abstractions.Models.Domain.Property>> propertyMap)
    {
        var property = propertyMap[dbModel.PropertyPool][dbModel.PropertyId];
        var domain = new BulkModificationVariable
        {
            PropertyId = dbModel.PropertyId,
            PropertyPool = dbModel.PropertyPool,
            Property = property,
            Key = dbModel.Key,
            Name = dbModel.Name,
            // ProcessOperation = dbModel.ProcessOperation,
            // ProcessOptions =
            // dbModel.ProcessOptions.JsonDeserializeOrDefault(BulkModificationInternals
            // .PropertyTypeProcessorDescriptorMap[property.Type].ProcessOptionsType) as IBulkModificationProcessorOptions
        };

        if (dbModel.Preprocesses.IsNotEmpty())
        {
            try
            {
                var ja = JArray.Parse(dbModel.Preprocesses);

                var optionsType = BulkModificationInternals.PropertyTypeProcessorDescriptorMap[property.Type]
                    .ProcessOptionsType;

                domain.Preprocesses = ja.Select(jo =>
                {
                    var operation = jo["operation"];
                    var options = jo["options"];
                    if (operation != null)
                    {
                        return new BulkModificationProcessStep()
                        {
                            Operation = operation.Value<int>(),
                            Options = options?.ToObject(optionsType) as IBulkModificationProcessOptions
                        };
                    }

                    return null;
                }).OfType<BulkModificationProcessStep>().ToList();
            }
            catch
            {
                // ignored
            }
        }

        return domain;
    }

    public static List<BulkModificationProcessStep>? DeserializeAsBulkModificationProcessSteps(this string json,
        Type optionsType)
    {
        List<BulkModificationProcessStep>? steps = null;
        try
        {
            var ja = JArray.Parse(json);
            foreach (var jo in ja)
            {
                try
                {
                    var operation = jo[nameof(BulkModificationProcessStep.Operation).Camelize()]?.Value<int>();
                    var options = jo[nameof(BulkModificationProcessStep.Options).Camelize()]?.ToObject(optionsType);
                    if (operation.HasValue)
                    {
                        var step = new BulkModificationProcessStep
                        {
                            Operation = operation.Value,
                            Options = options as IBulkModificationProcessOptions
                        };
                        steps ??= [];
                        steps.Add(step);
                    }
                }
                catch (Exception)
                {
                    // ignored
                }

            }
        }
        catch (Exception)
        {
            // ignored
        }

        return steps;
    }

    private static BulkModificationProcess ToDomainModel(this BulkModificationProcessDbModel dbModel,
        Dictionary<PropertyPool, Dictionary<int, Bakabase.Abstractions.Models.Domain.Property>> propertyMap)
    {
        var property = propertyMap[dbModel.PropertyPool][dbModel.PropertyId];
        var optionsType = BulkModificationInternals.PropertyTypeProcessorDescriptorMap[property.Type]
            .ProcessOptionsType;
        var domain = new BulkModificationProcess
        {
            PropertyId = dbModel.PropertyId,
            PropertyPool = dbModel.PropertyPool,
            Property = property,
            Steps = dbModel.Steps?.DeserializeAsBulkModificationProcessSteps(optionsType)
        };

        return domain;
    }

    public static BulkModificationDbModel ToDbModel(this Abstractions.Models.BulkModification domainModel)
    {
        var dbModel = new BulkModificationDbModel
        {
            Id = domainModel.Id,
            Name = domainModel.Name,
            IsActive = domainModel.IsActive,
            Filter = domainModel.Filter?.ToDbModel().ToJson(),
            Processes = domainModel.Processes?.Select(p => p.ToDbModel()).ToJson(),
            Variables = domainModel.Variables?.Select(v => v.ToDbModel()).ToJson(),
            CreatedAt = domainModel.CreatedAt,
            FilteredResourceIds = domainModel.FilteredResourceIds?.ToJson()
        };

        return dbModel;
    }

    private static BulkModificationVariableDbModel ToDbModel(this BulkModificationVariable domainModel)
    {
        var dbModel = new BulkModificationVariableDbModel
        {
            Key = domainModel.Key,
            Name = domainModel.Name,
            PropertyId = domainModel.PropertyId,
            PropertyPool = domainModel.PropertyPool,
            Preprocesses = domainModel.Preprocesses.ToJson()
        };

        return dbModel;
    }

    private static BulkModificationProcessDbModel ToDbModel(this BulkModificationProcess domainModel)
    {
        var dbModel = new BulkModificationProcessDbModel
        {
            PropertyId = domainModel.PropertyId,
            PropertyPool = domainModel.PropertyPool,
            Steps = domainModel.Steps.ToJson()
        };

        return dbModel;
    }

    public static BulkModificationDiffDbModel ToDbModel(this BulkModificationDiff domainModel)
    {
        return new BulkModificationDiffDbModel
        {
            BulkModificationId = domainModel.BulkModificationId,
            Id = domainModel.Id,
            ResourceId = domainModel.ResourceId,
            ResourcePath = domainModel.ResourcePath,
            Diffs = domainModel.Diffs.Select(d => d.ToDbModel()).ToList().ToJson()
        };
    }

    public static async Task<List<BulkModificationDiff>> ToDomainModels(this List<BulkModificationDiffDbModel> dbModels,
        IPropertyService propertyService)
    {
        var domainModels = dbModels.Select(dbModel => new BulkModificationDiff
        {
            BulkModificationId = dbModel.BulkModificationId,
            Id = dbModel.Id,
            ResourceId = dbModel.ResourceId,
            ResourcePath = dbModel.ResourcePath,
        }).ToList();

        var dbDiffsMap = dbModels.ToDictionary(d => d.Id,
            d => d.Diffs.JsonDeserializeOrDefault<List<ResourceDiffDbModel>>() ?? []);

        var propertyPools = dbDiffsMap.Values.SelectMany(d => d.Select(x => x.PropertyPool)).Distinct()
            .Aggregate((PropertyPool) 0, (pool, propertyPool) => pool | propertyPool);
        var propertyMap = (await propertyService.GetProperties(propertyPools)).ToMap();

        foreach (var domainModel in domainModels)
        {
            var dbDiffs = dbDiffsMap[domainModel.Id];
            var domainDiffs = dbDiffs.Select(d =>
            {
                var property = propertyMap.GetValueOrDefault(d.PropertyPool)?.GetValueOrDefault(d.PropertyId);

                if (property == null)
                {
                    return null;
                }

                var domainDiff = d.ToDomainModel(s => s?.SerializeAsStandardValue(property.Type.GetBizValueType()));
                return domainDiff;
            }).OfType<ResourceDiff>().ToList();

            domainModel.Diffs = domainDiffs;
        }

        return domainModels;
    }

    public static async Task<Dictionary<PropertyPool, Dictionary<int, Bakabase.Abstractions.Models.Domain.Property>>>
        PreparePropertyMap(this List<BulkModificationDiff> diffs, IPropertyService propertyService, bool throwIfMissing)
    {
        var propertyPools = diffs.SelectMany(d => d.Diffs.Select(x => x.PropertyPool)).Distinct()
            .Aggregate((PropertyPool) 0, (pool, propertyPool) => pool | propertyPool);
        var propertyMap = (await propertyService.GetProperties(propertyPools)).ToMap();

        if (throwIfMissing)
        {
            foreach (var diff in diffs)
            {
                foreach (var rDiff in diff.Diffs)
                {
                    if (!propertyMap.TryGetValue(rDiff.PropertyPool, out var pm) ||
                        !pm.TryGetValue(rDiff.PropertyId, out _))
                    {
                        throw new Exception("Some of properties do not exist, please perform a preview again.");
                    }
                }
            }
        }

        return propertyMap;
    }

    // public static BulkModificationDiff ToDomainModel(this BulkModificationDiffDbModel dbModel)
    // {
    //     return new BulkModificationDiff
    //     {
    //         Id = dbModel.Id,
    //         BulkModificationId = dbModel.BulkModificationId,
    //         ResourceId = dbModel.ResourceId,
    //         ResourcePath = dbModel.ResourcePath,
    //         Diffs = dbModel.Diffs.JsonDeserializeOrDefault<List<ResourceDiffDbModel>>()?.Select(d => d.ToDomainModel())
    //             .ToList()
    //     };
    // }
}