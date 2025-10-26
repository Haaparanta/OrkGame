import enum
import random

from pydantic import BaseModel


def rocket_damage():
    return random.randint(0, 50)


def rocket_hit():
    return random.random() > 0.4


def charge_hit():
    return random.random() > 0.5


def granade_hit():
    return random.random() > 0.8


def flamethrower_fail():
    return random.random() > 0.1


def fail_dmg_boost_loss():
    return int(-0.2 * random.randint(0, 8) + 10)


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
                    effect.self_damage = rocket_damage()
                    effect.loose_damage_boost = fail_dmg_boost_loss()

            case ActionEnum.rage_up:
                effect.gain_damage_boost = random.randint(0, 10)

            case ActionEnum.patch_up:
                effect.self_heal = random.randint(5, 50)
                effect.enemy_heal = int(random.randint(5, 50) / 2)

            case ActionEnum.charge:
                if charge_hit():
                    effect.enemy_damage = 40
                    effect.self_damage = 10
                else:
                    effect.self_damage = 30
                    effect.loose_damage_boost = fail_dmg_boost_loss()
            case ActionEnum.throw_granade:
                if granade_hit():
                    effect.enemy_damage = 25
                else:
                    effect.self_damage = 25
                    effect.loose_damage_boost = fail_dmg_boost_loss()
            case ActionEnum.fire_flamethrower:
                if flamethrower_fail():
                    effect.enemy_damage = 100
                else:
                    effect.self_damage = 100
                    effect.loose_damage_boost = fail_dmg_boost_loss()
        return effect
