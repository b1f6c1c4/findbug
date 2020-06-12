#ifndef LATTICE_HOMO_SET_HPP
#define LATTICE_HOMO_SET_HPP

#include <unordered_set>
#include "elem.hpp"

typedef std::unordered_set<elem, elem::hasher> set_t;

template <bool UD>
class homo_set : public set_t {
public:
    homo_set &operator+=(const elem &el);

    bool operator<=(const elem &o) const;
    bool operator>=(const elem &o) const;
};

template<bool UD>
bool homo_set<UD>::operator>=(const elem &o) const {
    for (const auto &el : *this)
        if (el >= o)
            return true;
    return false;
}

template<bool UD>
bool homo_set<UD>::operator<=(const elem &o) const {
    for (const auto &el : *this)
        if (el <= o)
            return true;
    return false;
}

#endif //LATTICE_HOMO_SET_HPP
