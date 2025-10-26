import enum
import random

from pydantic import BaseModel


def rocket_damage():
    return random.randint(0, 50)


def rocket_hit():
    return random.random() > 0.4


def charge_hit():
    return random.random() > 0.25


def granade_hit():
    return random.random() > 0.3


def flamethrower_fail():
    return random.random() > 0.1

#Menetetään tai ei menetetä 1 rage
def fail_dmg_boost_loss():
    return int(random.random() > 0.5)


class Effect(BaseModel):
    self_heal: int = 0
    self_damage: int = 0
    enemy_damage: int = 0
    enemy_heal: int = 0

    gain_armor: int = 0
    gain_damage_boost: int = 0
    loose_armor: int = 0
    loose_damage_boost: int = 0


class ActionEnum(enum.StrEnum):
    shoot_rocket = "shoot_rocket"
    rage_up = "rage_up"
    patch_up = "heal"
    charge = "charge"
    throw_granade = "throw_granade"
    fire_flamethrower = "fire_flamethrower"

    def effect(self) -> Effect:
        effect = Effect()
        match self:
            case ActionEnum.shoot_rocket:
                if rocket_hit():
                    effect.enemy_damage = rocket_damage()
                else:
                    effect.loose_armor = 1
                    effect.loose_damage_boost = fail_dmg_boost_loss()

            case ActionEnum.rage_up:
                effect.gain_damage_boost = 1

            case ActionEnum.patch_up:
                effect.self_heal = 50

            case ActionEnum.charge:
                if charge_hit():
                    effect.enemy_damage = 50
                    effect.self_damage = 10
                else:
                    effect.self_damage = 20
                    effect.loose_damage_boost = fail_dmg_boost_loss()
            case ActionEnum.throw_granade:
                if granade_hit():
                    effect.enemy_damage = 25
                else:
                    effect.loose_armor = 1
                    effect.loose_damage_boost = fail_dmg_boost_loss()
            case ActionEnum.fire_flamethrower:
                if flamethrower_fail():
                    effect.enemy_damage = 100
                else:
                    effect.self_damage = 100
                    effect.loose_damage_boost = fail_dmg_boost_loss()
        return effect
