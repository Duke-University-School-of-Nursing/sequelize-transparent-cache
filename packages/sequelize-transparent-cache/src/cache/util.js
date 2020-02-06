function instanceToData (instance) {
  return instance.get({ plain: true })
}

function dataToInstance (model, data) {
  if (!data) {
    return data
  }

  const include = generateInclude(model)
  const instance = model.build(data, { isNewRecord: false, raw: false, include })

  restoreTimestamps(data, instance)

  return instance
}

function restoreTimestamps (data, instance) {
  const timestampFields = ['createdAt', 'updatedAt', 'deletedAt']

  for (const field of timestampFields) {
    const value = data[field]
    if (value) {
      instance.setDataValue(field, new Date(value))
    }
  }

  Object.keys(data).forEach(key => {
    const value = data[key]

    if (!value) {
      return
    }

    if (Array.isArray(value)) {
      try {
        const nestedInstances = instance.get(key)
        value.forEach((nestedValue, i) => restoreTimestamps(nestedValue, nestedInstances[i]))
      } catch (error) { // TODO: Fix issue with JSON and BLOB columns

      }

      return
    }

    if (typeof value === 'object') {
      try {
        const nestedInstance = instance.get(key)
        Object.values(value).forEach(nestedValue => restoreTimestamps(nestedValue, nestedInstance))
      } catch (error) { // TODO: Fix issue with JSON and BLOB columns

      }
    }
  })
}

function generateInclude (model, depth = 1) {
  const associations = [];
  if (Object.keys(model.associations).length > 0 && depth <= 5) {
    Object.keys(model.associations).forEach((key) => {
      const association = model.associations[key];
      let modelName;
      if (model.sequelize.isDefined(association.target.name)) {
        modelName = association.target.name;
      } else {
        return;
      }
      const target = model.sequelize.model(modelName)
      // we have to do this to get scopes to work
      target._injectScope({});
      associations.push({
        model: target,
        as: association.associationAccessor,
        include: generateInclude(target, depth + 1)
      })
    })
  }
  return associations;
}

module.exports = {
  instanceToData,
  dataToInstance
}
